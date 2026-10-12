using NUnit.Framework;
using UnityEngine;

namespace Kihamda.Tests
{
    public class CourierLayoutTests
    {
        [TestCase(335,820)] [TestCase(350,820)] [TestCase(390,844)]
        [TestCase(719,820)] [TestCase(720,660)] [TestCase(960,660)] [TestCase(1152,720)]
        public void AllRoutesKeepVisibleTargetsAndEightPixelGaps(int width,int height)
        {
            foreach(var map in CourierBoard.Levels){
                var layout=new CourierLayout(width,height,map[0].Length,map.Length);
                Assert.That(layout.Tile,Is.GreaterThan(24));
                Assert.That(layout.Board.xMin,Is.GreaterThanOrEqualTo(0));
                Assert.That(layout.Board.yMin,Is.GreaterThanOrEqualTo(layout.Stats.yMax));
                Assert.That(layout.Notice.yMax,Is.LessThanOrEqualTo(height));
                var controls=layout.Controls;
                foreach(var rect in controls){
                    Assert.That(rect.width,Is.GreaterThanOrEqualTo(44));
                    Assert.That(rect.height,Is.GreaterThanOrEqualTo(44));
                    Assert.That(rect.xMin,Is.GreaterThanOrEqualTo(0));
                    Assert.That(rect.xMax,Is.LessThanOrEqualTo(width));
                    Assert.That(rect.yMax,Is.LessThanOrEqualTo(layout.Notice.yMin));
                    Assert.That(rect.Overlaps(layout.Board),Is.False);
                }
                for(int i=0;i<controls.Length;i++)for(int j=i+1;j<controls.Length;j++){
                    var a=controls[i];var b=controls[j];
                    float gap=Mathf.Max(b.xMin-a.xMax,a.xMin-b.xMax,b.yMin-a.yMax,a.yMin-b.yMax);
                    Assert.That(gap,Is.GreaterThanOrEqualTo(7.99f));
                }
            }
        }
        [Test] public void SwipeRequiresOneUninterruptedBoardGesture()
        {
            var board=new Rect(10,10,200,200);var gesture=new CourierGesture();Vector2Int direction;
            Assert.That(gesture.End(new Vector2(100,30),board,out direction),Is.False);
            gesture.Begin(new Vector2(0,30),board);Assert.That(gesture.End(new Vector2(100,30),board,out direction),Is.False);
            gesture.Begin(new Vector2(30,30),board);gesture.Track(new Vector2(240,30),board);
            Assert.That(gesture.End(new Vector2(100,30),board,out direction),Is.False);
            gesture.Begin(new Vector2(30,30),board);gesture.Cancel();Assert.That(gesture.End(new Vector2(100,30),board,out direction),Is.False);
            gesture.Begin(new Vector2(30,30),board);Assert.That(gesture.End(new Vector2(40,30),board,out direction),Is.False);
            foreach(var delta in new[]{new Vector2(60,0),new Vector2(-60,0),new Vector2(0,60),new Vector2(0,-60)}){
                gesture.Begin(new Vector2(100,100),board);
                Assert.That(gesture.End(new Vector2(100,100)+delta,board,out direction),Is.True);
                Assert.That(direction,Is.EqualTo(new Vector2Int((int)Mathf.Sign(delta.x)*(delta.x==0?0:1),(int)Mathf.Sign(delta.y)*(delta.y==0?0:1))));
                Assert.That(gesture.End(new Vector2(100,100)+delta,board,out direction),Is.False);
            }
        }
    }
}
