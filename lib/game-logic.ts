import { TransportType } from "./types"

export function calculateSatisfaction(citizens: any[]): number {
  if (citizens.length === 0) return 100

  const satisfiedCount = citizens.filter((c) => c.satisfied).length
  return Math.round((satisfiedCount / citizens.length) * 100)
}

export function calculateScore(citizens: any[], routes: any[], satisfaction: number): number {
  // Base score from satisfied citizens
  const citizenScore = citizens.filter((c) => c.satisfied).length * 10

  // Score from transport network efficiency
  const networkScore = routes.reduce((score, route) => {
    // Different transport types give different scores
    switch (route.type) {
      case TransportType.BIKE_LANE:
        return score + 5
      case TransportType.PEDESTRIAN_PATH:
        return score + 3
      case TransportType.SCOOTER_STATION:
        return score + 7
      case TransportType.LIGHT_RAIL:
        return score + 15
      default:
        return score
    }
  }, 0)

  // Satisfaction multiplier
  const satisfactionMultiplier = satisfaction / 100

  // Calculate final score
  return Math.round((citizenScore + networkScore) * satisfactionMultiplier)
}

