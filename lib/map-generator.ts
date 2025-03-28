import { PointOfInterestType } from "./types"

export function generateInitialMap(width: number, height: number) {
  return {
    width,
    height,
    obstacles: [], // For future implementation: rivers, hills, etc.
  }
}

export function generatePointOfInterest(x: number, y: number, type: PointOfInterestType) {
  return {
    id: `poi-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    type,
    capacity: getCapacityByType(type),
  }
}

function getCapacityByType(type: PointOfInterestType): number {
  switch (type) {
    case PointOfInterestType.RESIDENTIAL:
      return Math.floor(Math.random() * 50) + 50 // 50-100
    case PointOfInterestType.OFFICE:
      return Math.floor(Math.random() * 30) + 20 // 20-50
    case PointOfInterestType.SCHOOL:
      return Math.floor(Math.random() * 20) + 10 // 10-30
    case PointOfInterestType.STATION:
      return Math.floor(Math.random() * 100) + 50 // 50-150
    case PointOfInterestType.LEISURE:
      return Math.floor(Math.random() * 40) + 10 // 10-50
    default:
      return 10
  }
}

