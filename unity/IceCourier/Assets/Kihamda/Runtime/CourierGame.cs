using UnityEngine;

namespace Kihamda
{
    public sealed class CourierGame : MonoBehaviour
    {
        public CourierBoard Board {get;private set;}
        public int Level {get;private set;}
        GUIStyle title,body,button,symbol;
        Vector2 display;
        readonly CourierGesture gesture = new CourierGesture();
        int touchId = -1;
        float busyUntil;
        string notice="";
        bool initialized;
        const string SaveKey="ice-courier-v1";
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void HookScenes()
        {
            UnityEngine.SceneManagement.SceneManager.sceneLoaded-=OnSceneLoaded;
            UnityEngine.SceneManagement.SceneManager.sceneLoaded+=OnSceneLoaded;
        }
        static void OnSceneLoaded(UnityEngine.SceneManagement.Scene scene,UnityEngine.SceneManagement.LoadSceneMode mode)
        {
            if(UnityEngine.SceneManagement.SceneManager.GetActiveScene().name!="Migration") return;
            if(FindFirstObjectByType<CourierGame>()==null)new GameObject("Ice Courier").AddComponent<CourierGame>();
        }
        void Awake() {
            Application.targetFrameRate=60;
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGLInput.captureAllKeyboardInput=false;
#endif
            Open(0);
        }
        public void Open(int level)
        {
            Level=Mathf.Clamp(level,0,CourierBoard.Levels.Length-1);Board=new CourierBoard(CourierBoard.Levels[Level]);
            display=new Vector2(Board.X,Board.Y);busyUntil=0;notice="";gesture.Cancel();touchId=-1;
        }
        public bool Move(int dx,int dy)
        {
            if(Time.unscaledTime<busyUntil || !Board.Slide(dx,dy))return false;
            busyUntil=Time.unscaledTime+0.17f;Save();
            if(Board.Won)notice="Delivery complete. Every departure changed the route.";
            return true;
        }
        public void Undo() {if(Board.Undo()){busyUntil=0;notice="";Save();}}
        public void Save()
        {
            try {PlayerPrefs.SetString(SaveKey,Level+";"+Board.Export());PlayerPrefs.Save();}
            catch(System.Exception){notice="Saving is unavailable. You can still play.";}
        }
        public bool Resume()
        {
            try {
                string[] parts=PlayerPrefs.GetString(SaveKey,"").Split(';');
                if(parts.Length!=2 || !int.TryParse(parts[0],out int level) || level<0 || level>=CourierBoard.Levels.Length)return false;
                var restored=new CourierBoard(CourierBoard.Levels[level]);if(!restored.Restore(parts[1]))return false;
                Level=level;Board=restored;display=new Vector2(Board.X,Board.Y);busyUntil=0;gesture.Cancel();touchId=-1;notice="Route restored. Undo history starts here.";return true;
            }catch(System.Exception){notice="Save data could not be restored.";return false;}
        }
        void Update(){
            display=Vector2.MoveTowards(display,new Vector2(Board.X,Board.Y),Time.unscaledDeltaTime*28);
            if(Input.touchCount>1){gesture.Cancel();touchId=-2;return;}
            if(Input.touchCount==0){if(touchId!=-1)gesture.Cancel();touchId=-1;return;}
            var touch=Input.GetTouch(0);var point=new Vector2(touch.position.x,Screen.height-touch.position.y);
            var board=new CourierLayout(Screen.width,Screen.height,Board.Width,Board.Height).Board;
            if(touch.phase==TouchPhase.Began&&touchId!=-2){touchId=touch.fingerId;gesture.Begin(point,board);}
            if(touchId!=touch.fingerId)return;
            if(touch.phase==TouchPhase.Canceled){gesture.Cancel();touchId=-2;}
            else if(touch.phase==TouchPhase.Ended){if(gesture.End(point,board,out var direction))Move(direction.x,direction.y);touchId=-2;}
            else gesture.Track(point,board);
        }
        void OnApplicationFocus(bool focus){if(!focus){gesture.Cancel();touchId=-2;}}
        void Box(Rect rect,Color color){GUI.color=color;GUI.DrawTexture(rect,Texture2D.whiteTexture);GUI.color=Color.white;}
        void Text(Rect rect,string text,GUIStyle style,Color color){GUI.color=color;GUI.Label(rect,text,style);GUI.color=Color.white;}
        void OnGUI()
        {
            if(!initialized){title=new GUIStyle(GUI.skin.label){fontSize=28,fontStyle=FontStyle.Bold};body=new GUIStyle(GUI.skin.label){fontSize=16,wordWrap=true};button=new GUIStyle(GUI.skin.button){fontSize=16};symbol=new GUIStyle(GUI.skin.label){fontSize=18,fontStyle=FontStyle.Bold,alignment=TextAnchor.MiddleCenter};initialized=true;}
            var layout=new CourierLayout(Screen.width,Screen.height,Board.Width,Board.Height);
            GUI.matrix=Matrix4x4.identity;
            Box(new Rect(0,0,Screen.width,Screen.height),new Color(.025f,.055f,.085f));
            Text(layout.Title,"ICE COURIER",title,new Color(.76f,.94f,1));
            Text(layout.Rules,"Collect C parcels, then reach G. Slide until a wall. Each departure leaves a frozen stop (+). Undo is free.",body,new Color(.76f,.86f,.9f));
            Text(layout.Stats,$"ROUTE {Level+1}/{CourierBoard.Levels.Length}   C {Board.Parcels.Count}/{Board.TotalParcels}   MOVES {Board.Moves}",body,Color.white);
            float tile=layout.Tile,ox=layout.Board.x,oy=layout.Board.y;
            for(int y=0;y<Board.Height;y++)for(int x=0;x<Board.Width;x++){
                Rect rect=new Rect(ox+x*tile,oy+y*tile,tile-3,tile-3);bool wall=Board.Map[y][x]=='#';
                Box(rect,wall?new Color(.08f,.14f,.19f):new Color(.11f,.25f,.32f));
                if(wall)Box(new Rect(rect.x+8,rect.y+8,rect.width-16,4),new Color(.2f,.32f,.4f));
                if(Board.Frost.Contains(y*Board.Width+x)){
                    Box(new Rect(rect.x+4,rect.y+4,rect.width-8,rect.height-8),new Color(.32f,.66f,.75f));
                    Text(rect,"+",symbol,new Color(.025f,.055f,.085f));
                }
                if(Board.Map[y][x]=='C'&&!Board.Parcels.Contains(y*Board.Width+x)){
                    Box(new Rect(rect.x+4,rect.y+4,rect.width-8,rect.height-8),new Color(1,.68f,.22f));
                    Text(rect,"C",symbol,new Color(.025f,.055f,.085f));
                }
                if(Board.Map[y][x]=='G'){
                    Box(new Rect(rect.x+4,rect.y+4,rect.width-8,rect.height-8),new Color(.16f,.46f,.38f));
                    Text(rect,"G",symbol,new Color(.6f,1,.8f));
                }
            }
            Rect player=new Rect(ox+display.x*tile+4,oy+display.y*tile+4,tile-11,tile-11);
            Box(player,new Color(.9f,.98f,1));Text(player,"@",symbol,new Color(.025f,.055f,.085f));
            Text(layout.Legend,"C Parcel   G Beacon\n+ Frozen stop   @ Courier",body,new Color(.76f,.86f,.9f));
            if(GUI.Button(layout.Up,"UP",button))Move(0,-1);
            if(GUI.Button(layout.Left,"LEFT",button))Move(-1,0);
            if(GUI.Button(layout.Down,"DOWN",button))Move(0,1);
            if(GUI.Button(layout.Right,"RIGHT",button))Move(1,0);
            if(GUI.Button(layout.Undo,"UNDO",button))Undo();
            if(GUI.Button(layout.Restart,"RESTART",button)){Open(Level);Save();}
            if(GUI.Button(layout.Resume,"RESUME",button)&&!Resume())notice="No valid saved route.";
            if(Board.Won&&Level+1<CourierBoard.Levels.Length&&GUI.Button(layout.Next,"NEXT",button)){Open(Level+1);Save();}
            Text(layout.Notice,notice.Length>0?notice:"Arrow keys / WASD or buttons. R: restart. Z: undo. Swipe within the board.",body,new Color(.76f,.86f,.9f));
            var e=Event.current;
            if(e.type==EventType.KeyDown){
                switch(e.keyCode){case KeyCode.W:case KeyCode.UpArrow:Move(0,-1);break;case KeyCode.S:case KeyCode.DownArrow:Move(0,1);break;case KeyCode.A:case KeyCode.LeftArrow:Move(-1,0);break;case KeyCode.D:case KeyCode.RightArrow:Move(1,0);break;case KeyCode.Z:Undo();break;case KeyCode.R:Open(Level);Save();break;default:return;}e.Use();
            }
            if(Input.touchCount==0&&touchId==-1&&e.button==0){
                if(e.type==EventType.MouseDown)gesture.Begin(e.mousePosition,layout.Board);
                if(e.type==EventType.MouseDrag)gesture.Track(e.mousePosition,layout.Board);
                if(e.type==EventType.MouseUp&&gesture.End(e.mousePosition,layout.Board,out var direction))Move(direction.x,direction.y);
            }
            GUI.matrix=Matrix4x4.identity;
        }
    }
}
