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
            LogAssert.NoUnexpectedReceived();
        }
    }
}
