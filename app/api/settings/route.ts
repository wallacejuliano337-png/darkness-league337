import {database,ensureAdminSchema} from "../_db";
import {ensureScoringSchema} from "../_scoring";

const cacheHeaders={"Cache-Control":"public, max-age=15, s-maxage=30, stale-while-revalidate=60"};

export async function GET(request:Request){
  try{
    await ensureAdminSchema();
    const scope=new URL(request.url).searchParams.get("scope")||"all",db=database();
    const settings=await db.prepare("SELECT * FROM competition_settings WHERE id='current'").first();
    if(scope==="core")return Response.json({success:true,settings},{headers:cacheHeaders});
    if(scope==="rules"){
      const rules=await db.prepare("SELECT section,content,sort_order,updated_at FROM rules ORDER BY sort_order,section").all();
      return Response.json({success:true,rules:rules.results},{headers:{"Cache-Control":"no-store"}});
    }
    if(scope==="home"){
      const[stages,prizes,count]=await Promise.all([
        db.prepare("SELECT * FROM competition_stages WHERE is_visible=1 ORDER BY order_index").all(),
        db.prepare("SELECT * FROM competition_prizes WHERE is_visible=1 ORDER BY order_index").all(),
        db.prepare("SELECT COUNT(*) total FROM teams WHERE status='APROVADA' AND deleted_at IS NULL").first() as Promise<any>
      ]);
      return Response.json({success:true,settings,stages:stages.results,prizes:prizes.results,registered:Number(count?.total||0)},{headers:cacheHeaders});
    }
    await ensureScoringSchema();
    const[stages,liveStandings,finalStandings,roundResults,finalizations]=await Promise.all([
      db.prepare("SELECT * FROM competition_stages WHERE is_visible=1 ORDER BY order_index").all(),
      db.prepare(`SELECT r.stage_id,s.name stage_name,t.id team_id,t.name,t.tag,t.logo_url,t.group_name,SUM(r.booyahs) booyahs,SUM(r.kills) kills,SUM(r.placement_points) placement_points,SUM(r.penalty_points) penalty_points,SUM(r.total_points) total_points FROM match_results r JOIN teams t ON t.id=r.team_id JOIN competition_stages s ON s.id=r.stage_id WHERE r.match_number>0 AND t.status='APROVADA' AND t.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM stage_finalizations f WHERE f.stage_id=r.stage_id) GROUP BY r.stage_id,t.id ORDER BY r.stage_id,total_points DESC,booyahs DESC,kills DESC,t.name ASC`).all(),
      db.prepare(`SELECT q.stage_id,s.name stage_name,t.id team_id,t.name,t.tag,t.logo_url,q.group_name,q.booyahs,q.kills,q.placement_points,q.penalty_points,q.total_points,q.final_position,q.qualification_status FROM stage_qualification_results q JOIN teams t ON t.id=q.team_id JOIN competition_stages s ON s.id=q.stage_id ORDER BY q.stage_id,q.final_position`).all(),
      db.prepare(`SELECT r.stage_id,r.round_name,s.name stage_name,t.id team_id,t.name,t.tag,t.logo_url,t.group_name,r.booyahs,r.kills,r.placement_points,r.penalty_points,r.total_points FROM published_standings r JOIN teams t ON t.id=r.team_id JOIN competition_stages s ON s.id=r.stage_id WHERE t.status='APROVADA' AND t.deleted_at IS NULL ORDER BY r.stage_id,r.round_name,total_points DESC,r.booyahs DESC,r.kills DESC,t.name ASC`).all(),
      db.prepare("SELECT stage_id,qualified_limit,finalized_at FROM stage_finalizations").all()
    ]);
    return Response.json({success:true,settings,stages:stages.results,prizes:[],standings:[...liveStandings.results,...finalStandings.results],roundResults:roundResults.results,finalizations:finalizations.results},{headers:cacheHeaders});
  }catch(e){console.error("[SETTINGS]",e);return Response.json({success:false,error:"Não foi possível carregar as configurações"},{status:500})}
}
