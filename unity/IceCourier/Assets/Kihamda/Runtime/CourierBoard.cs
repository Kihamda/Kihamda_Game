using System;
using System.Collections.Generic;
using System.Linq;

namespace Kihamda
{
    public sealed class CourierBoard
    {
        public static readonly string[][] Levels = {
            new[] {"#######", "#S...C#", "#.....#", "#.....#", "#....G#", "#######"},
            new[] {"########", "#S.....#", "#..#C..#", "#......#", "#C.#...#", "#.....G#", "########"},
            new[] {"#########", "#S......#", "#..#.#..#", "#C......#", "#..#.#C.#", "#......G#", "#########"}
        };
        public readonly string[] Map;
        public int X { get; private set; }
        public int Y { get; private set; }
        public int Moves { get; private set; }
        public bool Won { get; private set; }
        public readonly HashSet<int> Frost = new HashSet<int>();
        public readonly HashSet<int> Parcels = new HashSet<int>();
        public int TotalParcels { get; private set; }
        public int Width => Map[0].Length;
        public int Height => Map.Length;
        readonly Stack<Snapshot> history = new Stack<Snapshot>();
        struct Snapshot { public int X,Y,Moves; public bool Won; public int[] Frost,Parcels; }
        public CourierBoard(string[] map)
        {
            if (map == null || map.Length < 3 || map[0].Length < 3) throw new ArgumentException("Invalid map");
            Map = (string[])map.Clone(); int starts=0, goals=0;
            for (int y=0; y<Height; y++) {
                if (Map[y].Length != Width) throw new ArgumentException("Non-rectangular map");
                for (int x=0; x<Width; x++) {
                    char cell = Map[y][x];
                    if ("#.SCG".IndexOf(cell)<0) throw new ArgumentException("Unknown cell");
                    if (cell=='S') { X=x; Y=y; starts++; }
                    if (cell=='G') goals++;
                    if (cell=='C') TotalParcels++;
                }
            }
            if(starts!=1 || goals!=1) throw new ArgumentException("One start and goal required");
        }
        public bool Blocked(int x,int y) => x<0 || y<0 || x>=Width || y>=Height || Map[y][x]=='#' || Frost.Contains(y*Width+x);
        public bool Slide(int dx,int dy)
        {
            if (Won || Math.Abs(dx)+Math.Abs(dy)!=1 || Blocked(X+dx,Y+dy)) return false;
            history.Push(new Snapshot {X=X,Y=Y,Moves=Moves,Won=Won,Frost=Frost.ToArray(),Parcels=Parcels.ToArray()});
            int departure=Y*Width+X;
            while(!Blocked(X+dx,Y+dy)) {
                X+=dx; Y+=dy;
                if(Map[Y][X]=='C') Parcels.Add(Y*Width+X);
                if(Map[Y][X]=='G' && Parcels.Count==TotalParcels) { Won=true; break; }
            }
            Frost.Add(departure); Moves++; return true;
        }
        public bool Undo()
        {
            if(history.Count==0) return false;
            var old=history.Pop(); X=old.X;Y=old.Y;Moves=old.Moves;Won=old.Won;
            Frost.Clear(); Frost.UnionWith(old.Frost); Parcels.Clear(); Parcels.UnionWith(old.Parcels); return true;
        }
        public CourierBoard Fork()
        {
            var copy=new CourierBoard(Map) {X=X,Y=Y,Moves=Moves,Won=Won};
            copy.Frost.UnionWith(Frost); copy.Parcels.UnionWith(Parcels); return copy;
        }
        public string Key() => X+","+Y+":"+string.Join(",",Frost.OrderBy(x=>x))+":"+string.Join(",",Parcels.OrderBy(x=>x));
        public string Export() => X+"|"+Y+"|"+Moves+"|"+Won+"|"+string.Join(",",Frost.OrderBy(x=>x))+"|"+string.Join(",",Parcels.OrderBy(x=>x));
        public bool Restore(string save)
        {
            // Validate by replaying reachable states; no arbitrary coordinates or impossible wins.
            if(string.IsNullOrEmpty(save) || save.Length>4096) return false;
            var queue=new Queue<CourierBoard>(); var seen=new HashSet<string>();
            queue.Enqueue(new CourierBoard(Map));
            while(queue.Count>0 && seen.Count<50000) {
                var state=queue.Dequeue(); if(!seen.Add(state.Key())) continue;
                if(state.Export()==save) {
                    X=state.X;Y=state.Y;Moves=state.Moves;Won=state.Won;
                    Frost.Clear();Frost.UnionWith(state.Frost);Parcels.Clear();Parcels.UnionWith(state.Parcels); history.Clear();return true;
                }
                if(state.Won) continue;
                foreach(var direction in Directions) {var next=state.Fork(); if(next.Slide(direction[0],direction[1])) queue.Enqueue(next);}
            }
            return false;
        }
        public static readonly int[][] Directions={new[]{0,-1},new[]{1,0},new[]{0,1},new[]{-1,0}};
        public static int[] Solve(string[] map)
        {
            var queue=new Queue<(CourierBoard board,int[] route)>();var seen=new HashSet<string>();
            queue.Enqueue((new CourierBoard(map),Array.Empty<int>()));
            while(queue.Count>0 && seen.Count<100000) {
                var item=queue.Dequeue(); if(!seen.Add(item.board.Key()))continue;
                if(item.board.Won)return item.route;
                for(int d=0;d<4;d++){var next=item.board.Fork();if(next.Slide(Directions[d][0],Directions[d][1]))queue.Enqueue((next,item.route.Concat(new[]{d}).ToArray()));}
            }
            return null;
        }
    }
}
