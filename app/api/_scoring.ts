import {database} from "./_db";

export const DEFAULT_PLACEMENTS:Record<string,number>={1:12,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1,11:0,12:0};

export async function ensureScoringSchema(){
 const db=database();
 await db.prepare(`CREATE TABLE IF NOT EXISTS scoring_rules (id TEXT PRIMARY KEY,stage_id TEXT NOT NULL,version INTEGER NOT NULL,kills_points REAL NOT NULL DEFAULT 1,booyah_points REAL NOT NULL DEFAULT 3,placement_points_json TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(stage_id,version),FOREIGN KEY(stage_id) REFERENCES competition_stages(id))`).run();
 async function add(column:string,sql:string){const rows=(await db.prepare("PRAGMA table_info(match_results)").all()).results as {name:string}[];if(!rows.some(x=>x.name===column))await db.prepare(`ALTER TABLE match_results ADD COLUMN ${sql}`).run()}
 await add("placement_position","placement_position INTEGER NOT NULL DEFAULT 0");
 await add("total_points","total_points REAL");
 await add("scoring_rule_id","scoring_rule_id TEXT");
 await db.prepare("UPDATE match_results SET group_name=COALESCE((SELECT group_name FROM teams WHERE teams.id=match_results.team_id),'SEM GRUPO') WHERE group_name='SEM GRUPO'").run();
 await db.prepare("UPDATE published_standings SET group_name=COALESCE((SELECT group_name FROM teams WHERE teams.id=published_standings.team_id),'SEM GRUPO') WHERE group_name='SEM GRUPO'").run();
 const stages=(await db.prepare("SELECT id FROM competition_stages").all()).results as {id:string}[];
 for(const stage of stages){const active=await db.prepare("SELECT id FROM scoring_rules WHERE stage_id=? AND is_active=1 LIMIT 1").bind(stage.id).first();if(!active)await db.prepare("INSERT INTO scoring_rules(id,stage_id,version,kills_points,booyah_points,placement_points_json,is_active,created_at,updated_at) VALUES(?,?,1,1,3,?,1,?,?)").bind(crypto.randomUUID(),stage.id,JSON.stringify(DEFAULT_PLACEMENTS),Date.now(),Date.now()).run()}
 const published=await db.prepare("SELECT COUNT(*) total FROM published_standings").first() as any;
 if(Number(published?.total||0)===0){const legacy=(await db.prepare("SELECT stage_id,round_name,group_name,team_id,SUM(booyahs) booyahs,SUM(kills) kills,SUM(placement_points) placement_points,SUM(penalty_points) penalty_points,SUM(COALESCE(total_points,kills+placement_points-penalty_points)) total_points FROM match_results WHERE match_number=0 GROUP BY stage_id,round_name,group_name,team_id").all()).results as any[];if(legacy.length){const now=Date.now();await db.batch(legacy.map(x=>db.prepare("INSERT INTO published_standings(id,stage_id,round_name,group_name,team_id,booyahs,kills,placement_points,penalty_points,total_points,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),x.stage_id,x.round_name,x.group_name,x.team_id,Number(x.booyahs)||0,Number(x.kills)||0,Number(x.placement_points)||0,Number(x.penalty_points)||0,Number(x.total_points)||0,now)))}}
}

export function normalizePlacements(value:any){const out:Record<string,number>={};for(const [position,points] of Object.entries(value||{})){const p=Number(position),n=Number(points);if(Number.isInteger(p)&&p>0&&p<=100&&Number.isFinite(n)&&n>=0)out[String(p)]=n}return out}

export function scoreRow(row:any,rule:any){const placements=JSON.parse(rule.placement_points_json||"{}");const position=Math.max(0,Math.trunc(Number(row.placement_position)||0));const placementPoints=Number(placements[String(position)]||0);const booyahs=position===1?1:0;const kills=Math.max(0,Math.trunc(Number(row.kills)||0));const penalty=Math.max(0,Number(row.penalty_points)||0);return {position,placementPoints,booyahs,kills,penalty,total:placementPoints+kills*Number(rule.kills_points)+booyahs*Number(rule.booyah_points)-penalty}}
