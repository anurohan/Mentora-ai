type AuditResult = {
  name: string;
  status: "available" | "limited";
  detail: string;
};

const audit: AuditResult[] = [
  { name: "Runtime", status: "available", detail: `Node ${process.version}` },
  { name: "Operating system", status: "available", detail: process.platform },
  { name: "Local mode", status: "available", detail: "Enabled by default; cloud adapters are optional" },
  { name: "Ollama", status: "limited", detail: "Configure and run Ollama separately when local AI is desired" },
  { name: "Camera/microphone", status: "limited", detail: "Permission-gated adapters are planned for the focus-monitor phase" }
];

export function runAudit(): AuditResult[] {
  return audit;
}

if (process.argv.includes("--audit")) {
  console.table(runAudit());
} else {
  console.log("MENTORA foundation is ready. Run `npm run audit` for the local capability audit.");
}
