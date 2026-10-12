using System.Collections;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace Kihamda.Tests
{
    public class MigrationLoadTests
    {
        const string SaveKey="ice-courier-v1";
        bool hadSave;
        string previousSave;
        [SetUp] public void PreserveSave(){hadSave=PlayerPrefs.HasKey(SaveKey);previousSave=PlayerPrefs.GetString(SaveKey,"");}
        [TearDown] public void RestoreSave(){if(hadSave)PlayerPrefs.SetString(SaveKey,previousSave);else PlayerPrefs.DeleteKey(SaveKey);PlayerPrefs.Save();}
#if UNITY_EDITOR
        // Editor-only failure injection for a visible check. It never modifies PlayerPrefs.
        [UnityEditor.MenuItem("Kihamda/QA/Simulate save failure")]
        static void SimulateSaveFailure()
        {
            var game=Object.FindFirstObjectByType<CourierGame>();
            if(!Application.isPlaying||game==null)return;
            var field=typeof(CourierGame).GetField("writeSave",BindingFlags.Instance|BindingFlags.NonPublic);
            field.SetValue(game,new System.Action<string>(_=>throw new System.InvalidOperationException("Simulated unavailable save")));
            game.Save();
        }
        [UnityEditor.MenuItem("Kihamda/QA/Simulate save failure",true)]
        static bool CanSimulateSaveFailure()=>Application.isPlaying&&Object.FindFirstObjectByType<CourierGame>()!=null;
#endif
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
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator SaveFailureRemainsVisibleAfterDeliveryAndUndo()
        {
            yield return SceneManager.LoadSceneAsync("Migration");yield return null;
            var game=Object.FindFirstObjectByType<CourierGame>();game.Open(0);
            var field=typeof(CourierGame).GetField("writeSave",BindingFlags.Instance|BindingFlags.NonPublic);
            var original=(System.Action<string>)field.GetValue(game);
            field.SetValue(game,new System.Action<string>(_=>throw new System.InvalidOperationException("Simulated unavailable save")));
            try {
                Assert.That(game.Move(1,0),Is.True);Assert.That(game.StatusText,Does.Contain("Saving"));
                yield return new WaitForSecondsRealtime(.2f);
                Assert.That(game.Move(0,1),Is.True);Assert.That(game.Board.Won,Is.True);
                Assert.That(game.StatusText,Does.Contain("Delivery complete"));
                Assert.That(game.StatusText,Does.Contain("Saving"),"Delivery must not hide the save failure");
                game.Undo();Assert.That(game.Board.Won,Is.False);Assert.That(game.StatusText,Does.Contain("Saving"));
                yield return new WaitForSecondsRealtime(.2f);
                Assert.That(game.Move(0,1),Is.True);Assert.That(game.Board.Won,Is.True);
                field.SetValue(game,original);game.Save();Assert.That(game.StatusText,Does.Not.Contain("Saving"));
                game.Open(0);Assert.That(game.Resume(),Is.True);Assert.That(game.Board.Won,Is.True);
            } finally {field.SetValue(game,original);}
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator OlderSaveResumeDoesNotClearWriteFailure()
        {
            yield return SceneManager.LoadSceneAsync("Migration");yield return null;
            var game=Object.FindFirstObjectByType<CourierGame>();game.Open(0);Assert.That(game.Move(1,0),Is.True);
            string saved=game.Board.Export();
            var field=typeof(CourierGame).GetField("writeSave",BindingFlags.Instance|BindingFlags.NonPublic);
            var original=(System.Action<string>)field.GetValue(game);
            field.SetValue(game,new System.Action<string>(_=>throw new System.InvalidOperationException("Simulated unavailable save")));
            try {
                game.Save();game.Open(0);Assert.That(game.StatusText,Does.Contain("Saving"));
                Assert.That(game.Resume(),Is.True);Assert.That(game.Board.Export(),Is.EqualTo(saved));
                Assert.That(game.StatusText,Does.Contain("Saving"));Assert.That(game.StatusText,Does.Contain("Undo"));
                game.Undo();Assert.That(game.Board.Export(),Is.EqualTo(saved));
                Assert.That(game.Move(0,1),Is.True);game.Undo();Assert.That(game.Board.Export(),Is.EqualTo(saved));
            } finally {field.SetValue(game,original);}
            LogAssert.NoUnexpectedReceived();
        }
    }
}
