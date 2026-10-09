using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kihamda.Editor
{
    public static class StudioBuild
    {
        public const string ScenePath="Assets/Kihamda/Scenes/Migration.unity";
        public static void Validate()
        {
            if(Application.unityVersion!="6000.3.23f1")throw new Exception("Unity version mismatch");
            var scene=EditorSceneManager.OpenScene(ScenePath);
            if(!scene.IsValid()||UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsSortMode.None).Length!=1)throw new Exception("Invalid scene camera");
            for(int i=0;i<CourierBoard.Levels.Length;i++)if(CourierBoard.Solve(CourierBoard.Levels[i])==null)throw new Exception("Unsolvable level "+i);
            PlayerSettings.companyName="Kihamda.NET";PlayerSettings.productName="Ice Courier";PlayerSettings.bundleVersion="0.1.0";
            PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;PlayerSettings.WebGL.threadsSupport=false;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
            AssetDatabase.SaveAssets();Debug.Log("Ice Courier: scene and all route solutions validated.");
        }
        static string Argument(string name,string fallback=null)
        {
            string[] args=Environment.GetCommandLineArgs();int i=Array.IndexOf(args,name);return i>=0&&i+1<args.Length?args[i+1]:fallback;
        }
        public static void BuildCI()=>Build(EditorUserBuildSettings.activeBuildTarget,Argument("-studioOutput")??throw new Exception("Missing output"),Argument("-studioCommit")??throw new Exception("Missing commit"));
        public static void BuildWindows()=>Build(BuildTarget.StandaloneWindows64,"artifacts/build/ice-courier/StandaloneWindows64","local-uncommitted");
        public static void BuildWeb()=>Build(BuildTarget.WebGL,"artifacts/build/ice-courier/WebGL","local-uncommitted");
        static void Build(BuildTarget target,string output,string commit)
        {
            Validate();
            string root=Path.GetFullPath(Path.Combine(Application.dataPath,"../../.."));
            string directory=Path.GetFullPath(Path.Combine(root,output));
            string permitted=Path.Combine(root,"artifacts","build")+Path.DirectorySeparatorChar;
            if(!directory.StartsWith(permitted,StringComparison.OrdinalIgnoreCase))throw new Exception("Output outside artifacts/build");
            if(target!=BuildTarget.WebGL&&target!=BuildTarget.StandaloneWindows64)throw new Exception("Unsupported target");
            Directory.CreateDirectory(directory);
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},target=target,
                locationPathName=target==BuildTarget.WebGL?directory:Path.Combine(directory,"IceCourier.exe"),options=BuildOptions.StrictMode});
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
            File.WriteAllText(Path.Combine(directory,"build-version.json"),JsonUtility.ToJson(new Version{project="ice-courier",commit=commit,target=target.ToString(),unity=Application.unityVersion},true));
            var sums=Directory.GetFiles(directory,"*",SearchOption.AllDirectories).Where(file=>Path.GetFileName(file)!="SHA256SUMS").OrderBy(file=>file,StringComparer.Ordinal).Select(file=>{
                using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant()+"  "+Path.GetRelativePath(directory,file).Replace('\\','/');
            });
            File.WriteAllLines(Path.Combine(directory,"SHA256SUMS"),sums);
        }
        [Serializable]sealed class Version{public string project,commit,target,unity;}
    }
}
