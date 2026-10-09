using Kihamda;

static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
for(int index=0;index<CourierBoard.Levels.Length;index++){
    var route=CourierBoard.Solve(CourierBoard.Levels[index]);
    Check(route!=null,$"Unsolvable route {index+1}");
    var board=new CourierBoard(CourierBoard.Levels[index]);
    foreach(int move in route!){var d=CourierBoard.Directions[move];Check(board.Slide(d[0],d[1]),"Solver produced blocked action");}
    Check(board.Won&&board.Parcels.Count==board.TotalParcels,"Missing victory or parcel");
    var restored=new CourierBoard(board.Map);Check(restored.Restore(board.Export()),"Saved route could not resume");Check(restored.Export()==board.Export(),"Resume changed state");
    Console.WriteLine($"Route {index+1}: solved in {route.Length} moves; save/resume matches.");
}
var first=new CourierBoard(CourierBoard.Levels[0]);var initial=first.Export();
Check(!first.Slide(-1,0)&&first.Moves==0,"Blocked action consumed move");
Check(first.Slide(1,0)&&first.Parcels.Count==1&&first.Frost.Count==1,"Slide/collection/frost failed");
Check(first.Undo()&&first.Export()==initial,"Undo did not restore complete state");
Check(!first.Restore("-1|0|999|True||"),"Corrupt save accepted");
Check(first.Slide(1,0)&&first.Slide(0,1)&&first.Won,"Intro route could not complete");
Check(!first.Slide(-1,0),"Finished board still moves");
Check(first.Undo()&&!first.Won,"Undo failed after win");
Console.WriteLine("Core acceptance passed: solutions, parcels, frost, boundaries, undo, save/resume, corrupt save, victory.");
