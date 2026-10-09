using UnityEngine;

namespace Kihamda
{
    public sealed class CourierGame : MonoBehaviour
    {
        public CourierBoard Board {get;private set;}
        public int Level {get;private set;}
        GUIStyle title,body,button;
        Vector2 display,gesture;
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
        void Awake() {Application.targetFrameRate=60; Open(0);}
        public void Open(int level)
        {
            Level=Mathf.Clamp(level,0,CourierBoard.Levels.Length-1);Board=new CourierBoard(CourierBoard.Levels[Level]);
            display=new Vector2(Board.X,Board.Y);busyUntil=0;notice="";
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
                Level=level;Board=restored;display=new Vector2(Board.X,Board.Y);notice="Route restored. Undo history starts here.";return true;
            }catch(System.Exception){notice="Save data could not be restored.";return false;}
        }
        void Update(){display=Vector2.MoveTowards(display,new Vector2(Board.X,Board.Y),Time.unscaledDeltaTime*28);}
        void Box(Rect rect,Color color){GUI.color=color;GUI.DrawTexture(rect,Texture2D.whiteTexture);GUI.color=Color.white;}
        void Text(Rect rect,string text,GUIStyle style,Color color){GUI.color=color;GUI.Label(rect,text,style);GUI.color=Color.white;}
        void OnGUI()
        {
            if(!initialized){title=new GUIStyle(GUI.skin.label){fontSize=42,fontStyle=FontStyle.Bold};body=new GUIStyle(GUI.skin.label){fontSize=17,wordWrap=true};button=new GUIStyle(GUI.skin.button){fontSize=18};initialized=true;}
            float scale=Mathf.Min(Screen.width/960f,Screen.height/760f);
            GUI.matrix=Matrix4x4.TRS(new Vector3((Screen.width-960*scale)/2,(Screen.height-760*scale)/2,0),Quaternion.identity,Vector3.one*scale);
            Box(new Rect(0,0,960,760),new Color(.025f,.055f,.085f));
            Text(new Rect(44,22,860,60),"ICE COURIER",title,new Color(.76f,.94f,1));
            Text(new Rect(46,82,850,55),"Collect every amber parcel, then reach the beacon. You slide until a wall. Each departure leaves a frozen stop behind.",body,new Color(.56f,.72f,.8f));
            Text(new Rect(46,143,850,35),$"ROUTE {Level+1}/{CourierBoard.Levels.Length}     PARCELS {Board.Parcels.Count}/{Board.TotalParcels}     MOVES {Board.Moves}",body,Color.white);
            float tile=Mathf.Min(62,Mathf.Min(600f/Board.Width,405f/Board.Height));float ox=46,oy=194;
            for(int y=0;y<Board.Height;y++)for(int x=0;x<Board.Width;x++){
                Rect rect=new Rect(ox+x*tile,oy+y*tile,tile-3,tile-3);bool wall=Board.Map[y][x]=='#';
                Box(rect,wall?new Color(.08f,.14f,.19f):new Color(.11f,.25f,.32f));
                if(wall)Box(new Rect(rect.x+8,rect.y+8,rect.width-16,4),new Color(.2f,.32f,.4f));
                if(Board.Frost.Contains(y*Board.Width+x)){
                    Box(new Rect(rect.x+8,rect.y+8,rect.width-16,rect.height-16),new Color(.32f,.66f,.75f));
                    Text(new Rect(rect.x+12,rect.y+12,40,40),"+",body,Color.white);
                }
                if(Board.Map[y][x]=='C'&&!Board.Parcels.Contains(y*Board.Width+x))Box(new Rect(rect.x+tile*.3f,rect.y+tile*.3f,tile*.35f,tile*.35f),new Color(1,.68f,.22f));
                if(Board.Map[y][x]=='G'){
                    Box(new Rect(rect.x+8,rect.y+8,rect.width-16,rect.height-16),new Color(.16f,.46f,.38f));
                    Text(new Rect(rect.x+14,rect.y+12,40,40),"G",body,new Color(.6f,1,.8f));
                }
            }
            Box(new Rect(ox+display.x*tile+12,oy+display.y*tile+12,tile-27,tile-27),new Color(.9f,.98f,1));
            Text(new Rect(660,205,245,130),"YOUR FOOTPRINTS BECOME WALLS\n\nPlan what you leave behind. Undo is free; this is a thinking game.",body,new Color(.6f,.8f,.86f));
            if(GUI.Button(new Rect(734,360,75,54),"UP",button))Move(0,-1);
            if(GUI.Button(new Rect(660,420,75,54),"LEFT",button))Move(-1,0);
            if(GUI.Button(new Rect(738,420,75,54),"DOWN",button))Move(0,1);
            if(GUI.Button(new Rect(816,420,75,54),"RIGHT",button))Move(1,0);
            if(GUI.Button(new Rect(46,625,135,48),"UNDO",button))Undo();
            if(GUI.Button(new Rect(190,625,135,48),"RESTART",button)){Open(Level);Save();}
            if(GUI.Button(new Rect(334,625,135,48),"RESUME",button)&&!Resume())notice="No valid saved route.";
            if(Board.Won&&Level+1<CourierBoard.Levels.Length&&GUI.Button(new Rect(478,625,135,48),"NEXT ROUTE",button)){Open(Level+1);Save();}
            Text(new Rect(46,686,870,55),notice.Length>0?notice:"Arrow keys / WASD or buttons. R: restart. Z: undo. Swipe on the board.",body,new Color(.64f,.8f,.87f));
            var e=Event.current;
            if(e.type==EventType.KeyDown){
                switch(e.keyCode){case KeyCode.W:case KeyCode.UpArrow:Move(0,-1);break;case KeyCode.S:case KeyCode.DownArrow:Move(0,1);break;case KeyCode.A:case KeyCode.LeftArrow:Move(-1,0);break;case KeyCode.D:case KeyCode.RightArrow:Move(1,0);break;case KeyCode.Z:Undo();break;case KeyCode.R:Open(Level);Save();break;default:return;}e.Use();
            }
            if(e.type==EventType.MouseDown&&e.mousePosition.x<640)gesture=e.mousePosition;
            if(e.type==EventType.MouseUp&&e.mousePosition.x<640){var delta=e.mousePosition-gesture;if(delta.magnitude>35){if(Mathf.Abs(delta.x)>Mathf.Abs(delta.y))Move(delta.x>0?1:-1,0);else Move(0,delta.y>0?1:-1);}}
            GUI.matrix=Matrix4x4.identity;
        }
    }
}
