import { getGraphToken } from '@/lib/graphClient'

interface Team {
  id: string
  displayName: string
  description?: string
}

interface Channel {
  id: string
  displayName: string
  membershipType: string
}

export async function GET() {
  try {
    const token = await getGraphToken()

    // List all teams the app can see
    const teamsRes = await fetch(
      'https://graph.microsoft.com/v1.0/teams?$select=id,displayName,description&$top=50',
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!teamsRes.ok) {
      const err = await teamsRes.text()
      return Response.json(
        { error: `Teams list failed: ${err.slice(0, 200)}` },
        { status: teamsRes.status }
      )
    }

    const teamsData = await teamsRes.json() as { value: Team[] }
    const teams = teamsData.value ?? []

    // For each team, list its channels (parallel)
    const results = await Promise.all(
      teams.map(async (team) => {
        try {
          const chRes = await fetch(
            `https://graph.microsoft.com/v1.0/teams/${team.id}/channels?$select=id,displayName,membershipType`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          const chData = chRes.ok
            ? (await chRes.json() as { value: Channel[] })
            : { value: [] as Channel[] }

          return {
            teamId: team.id,
            teamName: team.displayName,
            channels: (chData.value ?? []).map(ch => ({
              // Format: "teamId:channelId" — what graphTeamIds expects
              graphId: `${team.id}:${ch.id}`,
              name: `${team.displayName} / ${ch.displayName}`,
              type: ch.membershipType,
            })),
          }
        } catch {
          return { teamId: team.id, teamName: team.displayName, channels: [] }
        }
      })
    )

    return Response.json({ teams: results })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
