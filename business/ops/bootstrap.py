"""One-time setup only; refuses to replace existing history."""
from pathlib import Path
from flow import Ledger, require

path = Path(__file__).with_name("ledger.json")
require(not path.exists(), "ledger exists: resume, never bootstrap over history")
ledger = Ledger(path)
revision = 0


def record(action, **data):
    global revision
    r = ledger.transact(revision, action, data)
    revision = r["revision"]
    return r["result"]


source = "user:current-thread:2026-10-08:game-pdca-scheduling"
record("init")
record("decision", id="D-game-pdca-20261008", source=source,
       hypothesis="一作の品質・再訪・実流入を改善し、費用を照合して継続純利益につなげる",
       next_step="ゲーム改善は定期runへ移し、今はPDCA基盤・PR・同時刻の定期処理を完成する",
       supersedes="handoff:DB-20261008-merge2048-storage",
       restrictions=["main push/merge starts CD", "no deployment", "no BOOTH changes", "0 JPY upfront"])
for eid, game, metric, acceptance, plan in [
    ("EXP-system", "business-runtime", "consistent_monthly_net_profit", ["fencing/CAS/recovery tested"],
     "運用基盤の整合性を内部検査。事業KPI改善は別観測"),
    ("EXP-catalog", "catalog", "return_rate_7d", ["一作の重点改善方針と掲載gate"],
     "匿名集計があれば期間・定義・sourceで人気/離脱/再訪を比較。なければ品質根拠だけ"),
    ("EXP-merge2048", "merge2048", "start_rate", ["保存拒否でも起動/得点できる", "モバイル盤面と操作"],
     "同一版公開後14/28日。game_start欠落を点検し測定定義変更を前後比較で混ぜない")]:
    record("experiment", id=eid, game_id=game, primary_metric=metric,
           hypothesis="改善した品質が意図的な開始と再訪につながる（効果未観測）",
           quality_acceptance=acceptance, measurement_plan=plan,
           decision_id="D-game-pdca-20261008", next_step="既存成果と未完了を確認", source=source)


def task(tid, objective, acceptance, outputs, checks, next_step, experiment="EXP-system",
         pdca="plan", priority=100, **extra):
    record("task", id=tid, objective=objective, acceptance=acceptance, outputs=outputs, checks=checks,
           next_step=next_step, experiment_id=experiment, pdca=pdca, priority=priority,
           hypothesis="実物・検査・観測を同じ実験へ結ぶ", decision_id="D-game-pdca-20261008",
           source=source, **extra)


task("T-system-bootstrap", "実行基盤と定期処理を完成させる",
     ["単独/WIP1/CAS/期限切れfence/復旧/履歴/PDCA/slotを検査", "別branchへ保存して読戻す", "専用定期処理を登録して照合"],
     ["business/ops/flow.py", "business/ops/ledger.json", "business/automation.json", "PR"],
     ["python unittest", "GitHub blob/head readback", "automation readback"],
     "最初の定期runで一作の掲載方針を選ぶ", pdca="do", priority=0)
task("T-catalog-first-plan", "一作ずつ深く作り込む方針で掲載作品と重点改善対象を選ぶ",
     ["現カタログ/3候補のコア体験と品質根拠", "実測がなければ人気null", "一作の受入条件と次の内部工程"],
     ["business/evidence/catalog-first-plan.json", "次のdecision/task"],
     ["catalog-policy gate", "匿名集計のsource/定義/期間"],
     "選んだ一作の具体欠陥を一工程だけ修正・検査", experiment="EXP-catalog", priority=10)
task("T-measurement-audit", "意図的なgame_startと既存計測の欠落を確認する",
     ["GA4/SC実測と固定表示を区別", "game_start実装/分母/再開の定義案", "資格不明/アクセスなしはnull"],
     ["business/evidence/measurement-audit.json", "計測用PR候補"],
     ["source audit", "QA送信は実訪問者へ含めない"],
     "本人許可後の同一版公開と14/28日匿名比較", experiment="EXP-merge2048", priority=20)
task("T-migrated-2048-review", "既存保存patchとモバイル候補を最新mainで再評価する",
     ["元commit/sha/patch適用差分を確認", "起動/キー/実タッチ/viewport/保存拒否/再開/SEO/性能を検査",
      "旧10検査をアクセスや収益実績にしない"],
     ["品質検査記録", "別branchの修正PR"],
     ["storage regressions", "browser interaction", "full build and shared-shell regression"],
     "同一版への本人公開判断と公開後実測",
     experiment="EXP-merge2048", pdca="do", priority=30, depends_on=["T-catalog-first-plan"],
     origin_id="T-20261008-game-storage-fix", origin_decision_id="DB-20261008-merge2048-storage",
     origin_source="https://github.com/Kihamda/Sell-Something-Well/blob/main/projects/income/events/00094.json",
     origin_status="Historical claim only; old lease not transferred. Patch prepared/not deployed per source README.",
     origin_unfinished=["mobile game shell QA", "anonymous measured data"])
task("T-monetization-eligibility", "広告/スポンサー/有料機能の一次条件と実測規模を比較する",
     ["公式規約/年齢/本人account/費用/保守", "RPM/購入率仮定と実測を区別", "全費用不明の利益null"],
     ["business/evidence/monetization-options.json"],
     ["official sources with access date", "same-period aggregate revenue/costs when available"],
     "費用0円の条件で採否decision、契約等は本人", experiment="EXP-catalog", priority=40)
task("T-release-measurement", "本人公開済み版の効果を14/28日窓で確認する",
     ["対象release証拠", "GA4/SC同一人口/定義/期間", "欠損はnull、raw before/afterを因果効果としない"],
     ["business/evidence/release-comparison.json"], ["contract completeness", "cohort followup"],
     "continue/improve/stop/unobservedのActと次工程", experiment="EXP-merge2048", pdca="check", priority=50)
record("block", task_id="T-release-measurement", source=source,
       reason="公開版・同期間匿名集計がない", next_step="本人が公開済み版と集計を共有した時だけ再開")
record("feedback", source=source, message="今は具体改善をせず、BOOTH同時刻の定期処理とPDCA管理を構築",
       next_step="専用定期処理を同時刻に登録、既存BOOTH変更なし")
record("feedback", source="user:current-thread:2026-10-08:main-cd",
       message="mainにpushするとCD走るからってのは覚えといて",
       next_step="別branchへの保存・PR作成まで。main push/merge/auto-merge禁止")
record("start", run_id="manual-bootstrap-20261008", source=source,
       note="Bootstrap work before ledger existed is retrospective preparation, not a fabricated prior claim.")
lease = record("claim", run_id="manual-bootstrap-20261008", task_id="T-system-bootstrap")
print({"revision": revision, "lease": lease})
