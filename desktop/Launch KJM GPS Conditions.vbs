' ===========================================================================
' KJM GPS Conditions - LAUNCHER
' Double-click this (or the desktop icon). It does everything:
'   1. Puts a "KJM GPS Conditions" icon on this computer's Desktop, and repairs
'      it if it points somewhere else or lost its picture.
'   2. Starts the app hidden (reuses it if it is already running, restarts it
'      if Dropbox has synced newer code) and opens it in your browser.
' No console windows, no admin, no installs: standard-library Python only, so
' there is no pip step. Each PC serves its own copy on 127.0.0.1:5560.
'
' Follows Dropbox\Apps\_APP STANDARD\APP PACKAGING PROTOCOL.txt, with the
' later fixes: one bounded file read (no loop that can hang), the netstat
' match carries a trailing space, the probe asks /api/version, and the start
' wait is timed by the clock. Per-PC files go in %LOCALAPPDATA%\KJM GPS
' Conditions\ (launcher.log, server.log), never in Dropbox.
' ===========================================================================

Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appName   = "KJM GPS Conditions"
port      = "5560"
entryFile = "app.py"
iconFile  = "gps_conditions.ico"
iconDesc  = "Is today a good GPS day? Space weather + satellites"

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir    = scriptDir & "\app"
appPath   = appDir & "\" & entryFile
iconPath  = appDir & "\" & iconFile
' 127.0.0.1, NOT localhost: the app binds IPv4 only, and a localhost probe can
' wander to ::1 and hang the launcher against a running server.
url       = "http://127.0.0.1:" & port & "/"

stateDir = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\" & appName
If Not fso.FolderExists(stateDir) Then
    On Error Resume Next
    fso.CreateFolder stateDir
    On Error GoTo 0
End If

Sub LogLine(msg)
    On Error Resume Next
    Set lf = fso.OpenTextFile(stateDir & "\launcher.log", 8, True)
    lf.WriteLine Now & " " & msg
    lf.Close
    On Error GoTo 0
End Sub

' ---- Desktop icon: create it, or repair target + icon when they differ ----
Sub EnsureIcon()
    On Error Resume Next
    lnkPath = shell.SpecialFolders("Desktop") & "\" & appName & ".lnk"
    existed = fso.FileExists(lnkPath)
    Set lnk = shell.CreateShortcut(lnkPath)
    changed = False
    If LCase(lnk.TargetPath) <> LCase(WScript.ScriptFullName) Then lnk.TargetPath = WScript.ScriptFullName : changed = True
    If LCase(lnk.WorkingDirectory) <> LCase(scriptDir) Then lnk.WorkingDirectory = scriptDir : changed = True
    If fso.FileExists(iconPath) Then
        If LCase(lnk.IconLocation) <> LCase(iconPath & ",0") Then lnk.IconLocation = iconPath & ",0" : changed = True
    End If
    If lnk.Description <> iconDesc Then lnk.Description = iconDesc : changed = True
    If changed Or Not existed Then lnk.Save
    If Err.Number <> 0 Then LogLine "icon: " & Err.Description
    On Error GoTo 0
End Sub

' One bounded read: never a loop whose condition can raise under On Error Resume Next.
Function ReadSmall(path)
    ReadSmall = ""
    If Not fso.FileExists(path) Then Exit Function
    On Error Resume Next
    Set f = fso.OpenTextFile(path, 1)
    If Err.Number = 0 Then
        ReadSmall = f.Read(20000)
        If Err.Number <> 0 Then ReadSmall = ""
        f.Close
    End If
    Err.Clear
    On Error GoTo 0
End Function

' ---- Find pythonw.exe on this computer. The launcher runs pythonw DIRECTLY,
'      never through a PowerShell shim: wscript->powershell from a user
'      double-click silently freezes on some machines. ----
Function FindPythonw()
    FindPythonw = ""
    localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
    For Each base In Array(localAppData & "\Programs\Python", localAppData & "\Python")
        If fso.FolderExists(base) Then
            For Each pyDir In fso.GetFolder(base).SubFolders
                If fso.FileExists(pyDir.Path & "\pythonw.exe") Then
                    FindPythonw = pyDir.Path & "\pythonw.exe"
                    Exit Function
                End If
            Next
        End If
    Next
    For Each base In Array("C:\Program Files\Python314", "C:\Program Files\Python313", "C:\Program Files\Python312", "C:\Program Files\Python311", "C:\Python314", "C:\Python313", "C:\Python312", "C:\Python311")
        If fso.FileExists(base & "\pythonw.exe") Then
            FindPythonw = base & "\pythonw.exe"
            Exit Function
        End If
    Next
    ' Last resort: ask the 'python' on PATH where it lives, use its pythonw.
    pyProbe = stateDir & "\pyexe.txt"
    shell.Run "cmd /c python -c ""import sys;print(sys.executable)"" > """ & pyProbe & """ 2>&1", 0, True
    pyExe = Trim(Replace(Replace(ReadSmall(pyProbe), vbCr, ""), vbLf, ""))
    If Len(pyExe) > 3 Then
        If fso.FileExists(fso.GetParentFolderName(pyExe) & "\pythonw.exe") Then FindPythonw = fso.GetParentFolderName(pyExe) & "\pythonw.exe"
    End If
End Function

Function DiskVersion()
    ' APP_VERSION = "x.y.z" from app\app.py on disk (what Dropbox synced).
    DiskVersion = ""
    For Each ln In Split(Replace(ReadSmall(appPath), vbCr, ""), vbLf)
        If Left(ln, 11) = "APP_VERSION" Then
            p1 = InStr(ln, Chr(34))
            p2 = InStrRev(ln, Chr(34))
            If p2 > p1 Then DiskVersion = Mid(ln, p1 + 1, p2 - p1 - 1)
            Exit For
        End If
    Next
End Function

Function RunningVersion()
    ' The version the server on this port reports; "" if nothing answers.
    ' ServerXMLHTTP (WinHTTP) + timeouts, NEVER XMLHTTP (WinINet can hang forever).
    RunningVersion = ""
    On Error Resume Next
    Set vh = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    vh.setTimeouts 1000, 1000, 2000, 2000
    vh.Open "GET", url & "api/version", False
    vh.Send
    If Err.Number = 0 Then
        If vh.Status = 200 Then RunningVersion = Trim(vh.responseText)
    End If
    On Error GoTo 0
End Function

' Seconds since t0 by the clock (Timer wraps at midnight).
Function SecondsSince(t0)
    d = Timer - t0
    If d < 0 Then d = d + 86400
    SecondsSince = d
End Function

EnsureIcon

' ---- Reuse the running server if it is current; replace it if the code is newer ----
running = RunningVersion()
If running <> "" Then
    If (Not fso.FileExists(appPath)) Or running = DiskVersion() Then
        shell.Run url, 1, False
        WScript.Quit
    End If
    LogLine "running " & running & ", on disk " & DiskVersion() & ": restarting"
    ' trailing space after the port: ":5560 " must not also match :55600-55609
    shell.Run "cmd /c for /f ""tokens=5"" %p in ('netstat -ano ^| find "":" & port & " "" ^| find ""LISTENING""') do taskkill /f /pid %p", 0, True
    WScript.Sleep 1200
End If

If Not fso.FileExists(appPath) Then
    MsgBox "Cannot find the app files (app\" & entryFile & ") next to this launcher:" & vbCrLf & scriptDir & vbCrLf & vbCrLf & _
           "Let Dropbox finish syncing this folder (green check), then try again.", vbCritical, appName
    WScript.Quit
End If

pywExe = FindPythonw()
If pywExe = "" Then
    MsgBox "Python is not installed on this PC." & vbCrLf & vbCrLf & _
           "Install it from python.org (check ""Add Python to PATH""), or run" & vbCrLf & _
           "Dropbox\Apps\_APP STANDARD\FIX - Install Python (one click).cmd," & vbCrLf & _
           "then double-click this again.", vbCritical, appName
    WScript.Quit
End If

' ---- Start the server hidden (-B: no __pycache__ syncing into Dropbox) ----
shell.CurrentDirectory = appDir
shell.Run """" & pywExe & """ -B """ & appPath & """", 0, False
LogLine "started " & pywExe

t0 = Timer
Do While RunningVersion() = "" And SecondsSince(t0) < 60
    WScript.Sleep 400
Loop
If RunningVersion() = "" Then LogLine "server did not answer within 60 s - see server.log in this folder"

shell.Run url, 1, False
