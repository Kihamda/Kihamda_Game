import type { GameState, UpgradeType } from "../lib/types";
import { UPGRADES } from "../lib/constants";
import { formatNumber, canPurchaseUpgrade } from "../lib/clickmaster";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  gameState: GameState;
  onClick: (e: React.MouseEvent) => void;
  onPurchase: (upgradeId: UpgradeType) => void;
  onReset: () => void;
}

export function GameView({ gameState, onClick, onPurchase, onReset }: Props) {
  const { points, totalPoints, clickPower, autoClicksPerSecond, multiplier, upgrades } = gameState;

  const effectiveClickPower = Math.floor(clickPower * multiplier);
  const effectiveAutoRate = Math.floor(autoClicksPerSecond * multiplier);

  const handleReset = () => {
    if (window.confirm("本当にリセットしますか？すべての進捗が失われます。")) {
      onReset();
    }
  };

  // クリックや自動クリックが発生したかは親からincreasedとして渡される想定
  // シンプルにするため常にtrueにして、CSS keyでアニメーション
  const increased = true;

  return (
    <div className="clickmaster-game">
      {/* Stats */}
      <div className="clickmaster-stats">
        <AnimatedNumber value={points} increased={increased} />
        <p className="clickmaster-points-label">ポイント</p>
        <div className="clickmaster-rates">
          <span>クリック: +{formatNumber(effectiveClickPower)}</span>
          <span>自動: +{formatNumber(effectiveAutoRate)}/秒</span>
          <span>倍率: x{multiplier.toFixed(2)}</span>
        </div>
        <p className="clickmaster-total">累計: {formatNumber(totalPoints)} pts</p>
      </div>

      {/* Click Button */}
      <div className="clickmaster-click-area">
        <button
          type="button"
          className="clickmaster-click-btn"
          onClick={onClick}
        >
          CLICK!
        </button>
      </div>

      {/* Upgrades */}
      <div className="clickmaster-upgrades">
        <h2>アップグレード</h2>
        {upgrades.map((upgrade) => {
          const def = UPGRADES[upgrade.id];
          const canBuy = canPurchaseUpgrade(gameState, upgrade.id);
          return (
            <div key={upgrade.id} className="clickmaster-upgrade">
              <div className="clickmaster-upgrade-info">
                <p className="clickmaster-upgrade-name">{def.name}</p>
                <p className="clickmaster-upgrade-desc">{def.description}</p>
                <p className="clickmaster-upgrade-level">Lv.{upgrade.level}</p>
              </div>
              <button
                type="button"
                className="clickmaster-upgrade-btn"
                disabled={!canBuy}
                onClick={() => onPurchase(upgrade.id)}
              >
                {formatNumber(upgrade.cost)} pts
              </button>
            </div>
          );
        })}
      </div>

      {/* Reset */}
      <div className="clickmaster-footer">
        <button
          type="button"
          className="clickmaster-reset-btn"
          onClick={handleReset}
        >
          リセット
        </button>
      </div>
    </div>
  );
}
