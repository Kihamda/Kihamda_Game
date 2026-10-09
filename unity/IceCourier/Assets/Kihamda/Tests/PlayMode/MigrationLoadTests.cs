using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace Kihamda.Tests
{
    public class MigrationLoadTests
    {
        [UnityTest] public IEnumerator MigrationSceneRunsWithoutException()
        {
            yield return SceneManager.LoadSceneAsync("Migration");
            yield return null;
            Assert.That(Camera.main, Is.Not.Null);
            Assert.That(Camera.main.isActiveAndEnabled, Is.True);
            var game=Object.FindFirstObjectByType<CourierGame>();Assert.That(game,Is.Not.Null);
            game.Open(0);Assert.That(game.Move(1,0),Is.True);yield return new WaitForSecondsRealtime(.2f);
            Assert.That(game.Move(0,1),Is.True);Assert.That(game.Board.Won,Is.True);
            game.Save();game.Open(0);Assert.That(game.Resume(),Is.True);Assert.That(game.Board.Won,Is.True);
            PlayerPrefs.DeleteKey("ice-courier-v1");
            LogAssert.NoUnexpectedReceived();
        }
    }
}
