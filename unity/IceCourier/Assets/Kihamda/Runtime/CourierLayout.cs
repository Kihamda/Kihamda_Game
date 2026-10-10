using UnityEngine;

namespace Kihamda
{
    // Coordinates are visible pixels. The Web host synchronizes its canvas at DPR 1.
    public sealed class CourierLayout
    {
        public readonly bool Portrait;
        public readonly Rect Title, Rules, Stats, Board, Legend, Notice;
        public readonly Rect Up, Left, Down, Right, Undo, Restart, Resume, Next;
        public readonly float Tile;
        public CourierLayout(float width, float height, int columns, int rows)
        {
            Portrait = width < 720;
            Title = new Rect(16, 12, width - 32, 40);
            Rules = new Rect(16, 56, width - 32, Portrait ? 80 : 56);
            Stats = new Rect(16, Portrait ? 140 : 116, width - 32, 24);
            float boardTop = Portrait ? 172 : 156;
            float boardWidth = Portrait ? width - 32 : width * .60f - 32;
            float boardHeight = height - boardTop - (Portrait ? 376 : 132);
            Tile = Mathf.Min(Portrait ? 52 : 72, boardWidth / columns, boardHeight / rows);
            Board = new Rect(16 + (boardWidth - Tile * columns) / 2, boardTop, Tile * columns, Tile * rows);
            float x = Portrait ? 16 : width * .62f;
            float panelWidth = Portrait ? width - 32 : width - x - 16;
            float y = Portrait ? Board.yMax + 8 : boardTop;
            Legend = new Rect(x, y, panelWidth, 40);
            y += 48;
            float directionWidth = (panelWidth - 16) / 3;
            Up = new Rect(x + directionWidth + 8, y, directionWidth, 48);
            Left = new Rect(x, y + 56, directionWidth, 48);
            Down = new Rect(x + directionWidth + 8, y + 56, directionWidth, 48);
            Right = new Rect(x + 2 * (directionWidth + 8), y + 56, directionWidth, 48);
            y += 116;
            if (Portrait)
            {
                Undo = new Rect(x, y, directionWidth, 48);
                Restart = new Rect(x + directionWidth + 8, y, directionWidth, 48);
                Resume = new Rect(x + 2 * (directionWidth + 8), y, directionWidth, 48);
                Next = new Rect(x, y + 56, panelWidth, 48);
                Notice = new Rect(16, y + 116, width - 32, 72);
            }
            else
            {
                float half = (panelWidth - 8) / 2;
                Undo = new Rect(x, y, half, 48);
                Restart = new Rect(x + half + 8, y, half, 48);
                Resume = new Rect(x, y + 56, half, 48);
                Next = new Rect(x + half + 8, y + 56, half, 48);
                Notice = new Rect(16, Mathf.Max(Board.yMax + 56, y + 116), width - 32, 72);
            }
        }
        public Rect[] Controls => new[] { Up, Left, Down, Right, Undo, Restart, Resume, Next };
    }

    // Shared by mouse and physical touch; leaving the board cancels the whole gesture.
    public sealed class CourierGesture
    {
        bool active;
        Vector2 start;
        public void Begin(Vector2 point, Rect board) { active = board.Contains(point); start = point; }
        public void Track(Vector2 point, Rect board) { if (!board.Contains(point)) Cancel(); }
        public void Cancel() { active = false; }
        public bool End(Vector2 point, Rect board, out Vector2Int direction)
        {
            direction = Vector2Int.zero;
            bool valid = active && board.Contains(point);
            Cancel();
            Vector2 delta = point - start;
            if (!valid || delta.magnitude < 24) return false;
            direction = Mathf.Abs(delta.x) > Mathf.Abs(delta.y)
                ? new Vector2Int(delta.x > 0 ? 1 : -1, 0)
                : new Vector2Int(0, delta.y > 0 ? 1 : -1);
            return true;
        }
    }
}
