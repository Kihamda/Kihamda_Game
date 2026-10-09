import { formatNumber } from "../lib/clickmaster";

interface Props {
  value: number;
  increased: boolean;
}

/** 数字表示コンポーネント */
export function AnimatedNumber({ value, increased }: Props) {
  return (
    <p 
      className={`clickmaster-points ${increased ? "pulse" : ""}`}
      key={value} // valueが変わるたびにCSSアニメーションがリトリガー
    >
      {formatNumber(value)}
    </p>
  );
}