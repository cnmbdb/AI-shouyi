import { GraphicsCard } from "@phosphor-icons/react";

const loadingStages = ["验证账户", "读取算力资产", "准备控制台"];

export function ConsoleLoader({ message = "正在同步设备、跑算与资金数据" }) {
  return (
    <main className="console-loader-screen" role="status" aria-live="polite" aria-label="正在进入算力控制台">
      <section className="console-loader-card">
        <div className="console-loader-visual" aria-hidden="true">
          <div className="console-loader-gpu"><GraphicsCard weight="duotone" /><i /></div>
          <div className="console-loader-workload"><span /><span /><span /><span /><span /></div>
        </div>
        <div className="console-loader-copy">
          <strong>正在进入算力控制台</strong>
          <span>{message}</span>
        </div>
        <div className="console-loader-stages" aria-hidden="true">
          {loadingStages.map((stage, index) => <span key={stage} style={{ "--loader-delay": `${index * 0.42}s` }}><i />{stage}</span>)}
        </div>
        <div className="console-loader-track" aria-hidden="true"><i /></div>
      </section>
    </main>
  );
}
