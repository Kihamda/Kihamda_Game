using NUnit.Framework;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kihamda.Tests
{
    public class MigrationSceneTests
    {
        [Test] public void PreservedSceneOpensWithCamera()
        {
            var scene = EditorSceneManager.OpenScene(Editor.StudioBuild.ScenePath);
            Assert.That(scene.IsValid(), Is.True);
            Assert.That(Object.FindObjectsByType<Camera>(FindObjectsSortMode.None).Length, Is.EqualTo(1));
            Assert.That(Camera.main, Is.Not.Null);
        }
        [Test] public void EveryRouteCanFinishAndResume()
        {
            foreach(var map in CourierBoard.Levels){
                var solution=CourierBoard.Solve(map);Assert.That(solution,Is.Not.Null);
                var board=new CourierBoard(map);foreach(int move in solution){var d=CourierBoard.Directions[move];Assert.That(board.Slide(d[0],d[1]),Is.True);}
                Assert.That(board.Won,Is.True);var resumed=new CourierBoard(map);Assert.That(resumed.Restore(board.Export()),Is.True);Assert.That(resumed.Export(),Is.EqualTo(board.Export()));
            }
        }
    }
}
