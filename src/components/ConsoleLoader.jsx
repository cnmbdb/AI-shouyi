const loadingStages = ["验证账户", "读取算力资产", "准备控制台"];

function PixelGpu5090() {
  return (
    <span className="console-loader-pixel-gpu" aria-hidden="true">
      <svg viewBox="0 0 84 32" shapeRendering="crispEdges">
        <path className="pixel-gpu-body" d="M4 3h72v3h5v20h-5v3H4v-3H1V6h3V3Z" />
        <path className="pixel-gpu-edge" d="M4 3h72v3H4V3Zm72 3h5v20h-5V6ZM4 26h72v3H4v-3ZM1 6h3v20H1V6Z" />
        <g className="pixel-gpu-fan" transform="translate(8 6)">
          <path d="M6 0h6v4h4v4h4v6h-4v4h-4v4H6v-4H2v-4h-4V8h4V4h4V0Z" />
          <rect className="pixel-gpu-hub" x="6" y="8" width="6" height="6" />
        </g>
        <g className="pixel-gpu-fan" transform="translate(34 6)">
          <path d="M6 0h6v4h4v4h4v6h-4v4h-4v4H6v-4H2v-4h-4V8h4V4h4V0Z" />
          <rect className="pixel-gpu-hub" x="6" y="8" width="6" height="6" />
        </g>
        <rect className="pixel-gpu-port" x="59" y="7" width="14" height="4" />
        <rect className="pixel-gpu-port" x="59" y="14" width="14" height="3" />
        <rect className="pixel-gpu-port" x="59" y="20" width="9" height="3" />
        <rect className="pixel-gpu-contact" x="14" y="29" width="32" height="3" />
      </svg>
      <b>5090</b>
    </span>
  );
}

export function ConsoleLoader({ message = "正在同步设备、跑算与资金数据" }) {
  return (
    <main className="console-loader-screen" role="status" aria-live="polite" aria-label="正在进入算力控制台">
      <section className="console-loader-card">
        <div className="console-loader-copy">
          <strong>正在进入算力控制台</strong>
          <span>{message}</span>
        </div>
        <div className="console-loader-progress" aria-hidden="true">
          <div className="console-loader-rail">
            <i className="console-loader-fill" />
            <span className="console-loader-head"><PixelGpu5090 /></span>
          </div>
        </div>
        <div className="console-loader-stages" aria-hidden="true">
          {loadingStages.map((stage, index) => <span key={stage} style={{ "--loader-delay": `${index * 0.42}s` }}><i />{stage}</span>)}
        </div>
      </section>
    </main>
  );
}
