using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kihamda.Editor
{
    public static class MigrationBuild
    {
        public const string ScenePath = "Assets/Kihamda/Scenes/Migration.unity";
        public static void Validate()
        {
            if (Application.unityVersion != "6000.3.23f1") throw new Exception("Unity version mismatch");
            if (!File.Exists(ScenePath)) throw new Exception("Migration scene missing");
            EditorSceneManager.OpenScene(ScenePath);
            if (UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsSortMode.None).Length != 1)
                throw new Exception("Migration scene must have one camera");
            PlayerSettings.companyName = "Kihamda.NET";
            PlayerSettings.productName = "Kihamda Migration Check";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.threadsSupport = false;
            AssetDatabase.SaveAssets();
            Debug.Log("Migration project validated; no games implemented.");
        }
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Windows/Migration.exe");
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Web");
        static void Build(BuildTarget target, string suffix)
        {
            Validate();
            string root = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../.."));
            string path = Path.Combine(root, "artifacts/unity/KihamdaArcade", suffix);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = new[] { ScenePath }, locationPathName = path, target = target, options = BuildOptions.StrictMode
            });
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Build failed: " + report.summary.result);
            string directory = target == BuildTarget.WebGL ? path : Path.GetDirectoryName(path);
            File.WriteAllText(Path.Combine(directory, "build-version.json"), JsonUtility.ToJson(new BuildVersion {
                unity = Application.unityVersion, version = PlayerSettings.bundleVersion,
                commit = Environment.GetEnvironmentVariable("GITHUB_SHA") ?? "local-uncommitted", target = target.ToString()
            }, true));
            string[] hashes = Directory.GetFiles(directory, "*", SearchOption.AllDirectories)
                .Where(file => Path.GetFileName(file) != "SHA256SUMS")
                .OrderBy(file => file, StringComparer.Ordinal).Select(file => {
                    using (var sha = SHA256.Create())
                    { return BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(file))).Replace("-", "").ToLowerInvariant() + "  " + Path.GetRelativePath(directory, file).Replace('\\', '/'); }
                }).ToArray();
            File.WriteAllLines(Path.Combine(directory, "SHA256SUMS"), hashes);
        }
        [Serializable] sealed class BuildVersion { public string unity, version, commit, target; }
    }
}
