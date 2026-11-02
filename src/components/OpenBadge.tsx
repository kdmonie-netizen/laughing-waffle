import { useEffect, useState } from "react";
import { officeStatus } from "../lib/office";

export function OpenBadge() {
  const [status, setStatus] = useState(() => officeStatus(new Date()));

  useEffect(() => {
    const tick = () => setStatus(officeStatus(new Date()));
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={status.open ? "badge open" : "badge closed"}>{status.label}</span>;
}
