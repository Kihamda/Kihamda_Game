using NUnit.Framework;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kihamda.Tests
{
    public class MigrationSceneTests
    {
        [Test] public void PreservedSceneOpensWithCamera()
        {
            var scene = EditorSceneManager.OpenScene(Editor.MigrationBuild.ScenePath);
            Assert.That(scene.IsValid(), Is.True);
            Assert.That(Object.FindObjectsByType<Camera>(FindObjectsSortMode.None).Length, Is.EqualTo(1));
            Assert.That(Camera.main, Is.Not.Null);
        }
    }
}
