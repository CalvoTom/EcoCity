"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { generateInitialMap, generatePointOfInterest } from "@/lib/map-generator"
import { calculateSatisfaction, calculateScore } from "@/lib/game-logic"
import { TransportType, PointOfInterestType } from "@/lib/types"

// Add Challenge type at the top of the file after imports
type Challenge = {
  id: string
  description: string
  target: number
  current: number
  completed: boolean
  type:
    | "transport"
    | "satisfaction"
    | "co2"
    | "network"
    | "diversity"
    | "efficiency"
    | "economy"
    | "planning"
    | "sustainability"
    | "innovation"
}

// Add CO2 tracking and challenge system to GameContextType
type GameContextType = {
  map: any
  points: any[]
  routes: any[]
  citizens: any[]
  selectedTransport: TransportType | null
  satisfaction: number
  score: number
  resources: number
  day: number
  time: number
  co2Saved: number
  challenges: Challenge[]
  addRoute: (start: any, end: any, type: TransportType) => boolean
  removeRoute: (routeIndex: number) => void
  selectTransport: (type: TransportType) => void
  advanceTime: () => void
  showDestinations: boolean
  toggleShowDestinations: () => void
  getTransportCost: (type: TransportType, currentDay: number) => number
  hoveredRoute: number | null
  setHoveredRoute: (index: number | null) => void
  gameOver: boolean
  setGameOver: (value: boolean) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

// Composant Popup affiché à la fin de la partie
const GameOverPopup = ({
  day,
  co2Saved,
  citizensCount,
  score,
  onReset,
}: {
  day: number
  co2Saved: number
  citizensCount: number
  score: number
  onReset: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-emerald-600">Partie terminée</h2>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-emerald-50 p-3 rounded-md">
            <div className="text-3xl font-bold text-emerald-600">{(co2Saved / 1000).toFixed(2)} kg</div>
            <div className="text-sm text-emerald-600">CO₂ économisé</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-xl font-bold text-blue-600">{day}</div>
              <div className="text-sm text-blue-600">Jours</div>
            </div>

            <div className="bg-amber-50 p-3 rounded-md">
              <div className="text-xl font-bold text-amber-600">{citizensCount}</div>
              <div className="text-sm text-amber-600">Citoyens</div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-amber-50 p-3 rounded-md text-left">
          <p className="text-sm text-amber-800">
            Saviez-vous que si chaque habitant remplaçait un trajet en voiture par semaine par un transport doux, nous
            pourrions réduire les émissions de CO₂ de plus de 500 kg par personne et par an ?
          </p>
        </div>

        <button
          onClick={onReset}
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors w-full font-bold"
        >
          Retour
        </button>
      </div>
    </div>
  )
}

// Modify the generateRandomPosition function to enforce a minimum padding from the edges
const generateRandomPosition = (width: number, height: number, existingPoints: any[] = [], minDistance = 4) => {
  let x, y, tooClose
  const padding = 2 // Padding from the edges

  do {
    // Generate positions with padding from the edges
    x = Math.floor(Math.random() * (width - 2 * padding)) + padding
    y = Math.floor(Math.random() * (height - 2 * padding)) + padding

    // Vérifier si le point est trop proche d'un point existant
    tooClose = existingPoints.some((point) => {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
      return distance < minDistance
    })
  } while (tooClose)

  return { x, y }
}

// Fonction pour créer un citoyen
const createCitizen = (id: string | number, points: any[]) => {
  if (points.length < 2) return null

  // Sélectionner un point de départ et d'arrivée différents
  const startPointIndex = Math.floor(Math.random() * points.length)
  let endPointIndex
  do {
    endPointIndex = Math.floor(Math.random() * points.length)
  } while (endPointIndex === startPointIndex)

  return {
    id,
    location: points[startPointIndex],
    destination: points[endPointIndex],
    satisfied: true,
    transportMode: null,
    waitingTime: 0,
    journeyCompleted: false,
    co2Impact: 0,
    path: [],
  }
}

// Modifier la fonction GameProvider pour réduire le nombre initial de points et de citoyens
export function GameProvider({ children }: { children: ReactNode }) {
  // Augmenter la taille de la carte pour qu'elle occupe toute la partie gauche
  const mapWidth = 40
  const mapHeight = 30
  const [map, setMap] = useState<any>(generateInitialMap(mapWidth, mapHeight))
  const [points, setPoints] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [citizens, setCitizens] = useState<any[]>([])
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null)
  const [satisfaction, setSatisfaction] = useState(100)
  const [score, setScore] = useState(0)
  const [resources, setResources] = useState(600) // Réduit de 1000 à 600
  const [day, setDay] = useState(1)
  const [time, setTime] = useState(0)
  const [co2Saved, setCo2Saved] = useState(0)
  const [showDestinations, setShowDestinations] = useState(false)
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null)
  const [citizenIdCounter, setCitizenIdCounter] = useState(0) // Compteur pour générer des IDs uniques
  const [lowSatisfactionCounter, setLowSatisfactionCounter] = useState(0) // Compteur pour la satisfaction basse
  const [gameOver, setGameOver] = useState(false) // État de fin de partie
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: "challenge1",
      description: "Transporter 100 citoyens",
      target: 100,
      current: 0,
      completed: false,
      type: "transport",
    },
    {
      id: "challenge2",
      description: "Maintenir 80% de satisfaction pendant 3 jours",
      target: 3,
      current: 0,
      completed: false,
      type: "satisfaction",
    },
    {
      id: "challenge3",
      description: "Économiser 1000kg de CO2",
      target: 1000,
      current: 0,
      completed: false,
      type: "co2",
    },
    // Défis existants
    {
      id: "challenge4",
      description: "Créer un réseau de 15 routes",
      target: 15,
      current: 0,
      completed: false,
      type: "network",
    },
    {
      id: "challenge5",
      description: "Utiliser tous les types de transport",
      target: 4, // 4 types de transport
      current: 0,
      completed: false,
      type: "diversity",
    },
    {
      id: "challenge6",
      description: "Atteindre 95% de satisfaction",
      target: 95,
      current: 0,
      completed: false,
      type: "efficiency",
    },
    // Nouveaux défis
    {
      id: "challenge7",
      description: "Atteindre 2000€ de budget",
      target: 2000,
      current: 0,
      completed: false,
      type: "economy",
    },
    {
      id: "challenge8",
      description: "Connecter tous les points d'intérêt",
      target: 1, // Sera mis à jour dynamiquement
      current: 0,
      completed: false,
      type: "planning",
    },
    {
      id: "challenge9",
      description: "Survivre 10 jours",
      target: 10,
      current: 1,
      completed: false,
      type: "sustainability",
    },
    {
      id: "challenge10",
      description: "Avoir 50 citoyens satisfaits simultanément",
      target: 50,
      current: 0,
      completed: false,
      type: "innovation",
    },
  ])

  // Fonction de réinitialisation du jeu (ici on recharge la page)
  const resetGame = () => {
    window.location.reload()
  }

  // Initialiser la carte avec des points d'intérêt aléatoires
  useEffect(() => {
    // Générer seulement 3 points d'intérêt aléatoires pour simplifier le début
    const initialPoints = []
    const pointTypes = Object.values(PointOfInterestType)

    // Sélectionner 4 types aléatoires parmi les types disponibles
    const selectedTypes = [...pointTypes].sort(() => 0.5 - Math.random()).slice(0, 4)

    // Générer un point pour chacun des 4 types sélectionnés
    for (let i = 0; i < 4; i++) {
      const type = selectedTypes[i] as PointOfInterestType
      const { x, y } = generateRandomPosition(mapWidth, mapHeight, initialPoints, 6) // Augmenter la distance minimale
      initialPoints.push(generatePointOfInterest(x, y, type))
    }

    setPoints(initialPoints)

    // Générer des routes initiales valides
    const initialRoutes = []

    // Fonction pour vérifier si la distance est valide pour un type de transport
    const isValidDistance = (point1: any, point2: any, transportType: TransportType) => {
      const dx = Math.abs(point1.x - point2.x)
      const dy = Math.abs(point1.y - point2.y)
      const distance = Math.sqrt(dx * dx + dy * dy)

      const distanceLimits = {
        [TransportType.PEDESTRIAN_PATH]: 5,
        [TransportType.BIKE_LANE]: 10,
        [TransportType.SCOOTER_STATION]: 15,
        [TransportType.LIGHT_RAIL]: Number.POSITIVE_INFINITY,
      }

      return distance <= distanceLimits[transportType]
    }

    // Essayer de créer une route de vélo valide
    for (let i = 0; i < initialPoints.length; i++) {
      for (let j = i + 1; j < initialPoints.length; j++) {
        if (isValidDistance(initialPoints[i], initialPoints[j], TransportType.BIKE_LANE)) {
          initialRoutes.push({
            start: initialPoints[i],
            end: initialPoints[j],
            type: TransportType.BIKE_LANE,
          })
          break
        }
      }
      if (initialRoutes.length > 0) break
    }

    // Essayer de créer une route piétonne valide entre des points différents
    for (let i = 0; i < initialPoints.length; i++) {
      for (let j = i + 1; j < initialPoints.length; j++) {
        // Vérifier que ces points ne sont pas déjà utilisés dans la première route
        if (
          initialRoutes.length > 0 &&
          (initialRoutes[0].start === initialPoints[i] ||
            initialRoutes[0].end === initialPoints[i] ||
            initialRoutes[0].start === initialPoints[j] ||
            initialRoutes[0].end === initialPoints[j])
        ) {
          continue
        }

        if (isValidDistance(initialPoints[i], initialPoints[j], TransportType.PEDESTRIAN_PATH)) {
          initialRoutes.push({
            start: initialPoints[i],
            end: initialPoints[j],
            type: TransportType.PEDESTRIAN_PATH,
          })
          break
        }
      }
      if (initialRoutes.length > 1) break
    }

    // Si nous n'avons pas pu créer deux routes valides, essayer avec d'autres types de transport
    if (initialRoutes.length < 2) {
      for (let i = 0; i < initialPoints.length; i++) {
        for (let j = i + 1; j < initialPoints.length; j++) {
          if (
            initialRoutes.length > 0 &&
            (initialRoutes[0].start === initialPoints[i] ||
              initialRoutes[0].end === initialPoints[i] ||
              initialRoutes[0].start === initialPoints[j] ||
              initialRoutes[0].end === initialPoints[j])
          ) {
            continue
          }

          if (isValidDistance(initialPoints[i], initialPoints[j], TransportType.SCOOTER_STATION)) {
            initialRoutes.push({
              start: initialPoints[i],
              end: initialPoints[j],
              type: TransportType.SCOOTER_STATION,
            })
            break
          }
        }
        if (initialRoutes.length > 1) break
      }
    }

    // En dernier recours, utiliser un tramway qui n'a pas de limite de distance
    if (initialRoutes.length < 2) {
      for (let i = 0; i < initialPoints.length; i++) {
        for (let j = i + 1; j < initialPoints.length; j++) {
          if (
            initialRoutes.length > 0 &&
            (initialRoutes[0].start === initialPoints[i] ||
              initialRoutes[0].end === initialPoints[i] ||
              initialRoutes[0].start === initialPoints[j] ||
              initialRoutes[0].end === initialPoints[j])
          ) {
            continue
          }

          initialRoutes.push({
            start: initialPoints[i],
            end: initialPoints[j],
            type: TransportType.LIGHT_RAIL,
          })
          break
        }
        if (initialRoutes.length > 1) break
      }
    }

    setRoutes(initialRoutes)

    // Générer 6 citoyens initiaux
    const initialCitizens = []
    for (let i = 0; i < 6; i++) {
      const citizen = createCitizen(i, initialPoints)
      if (citizen) initialCitizens.push(citizen)
    }

    setCitizens(initialCitizens)
    setCitizenIdCounter(initialCitizens.length)

    // Mettre à jour le défi de connexion de tous les points
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === "challenge8") {
          return {
            ...challenge,
            target: initialPoints.length,
          }
        }
        return challenge
      }),
    )
  }, [])

  // Fonction pour ajouter des citoyens
  const addCitizens = (count: number) => {
    if (points.length < 2) return

    const newCitizens = []
    for (let i = 0; i < count; i++) {
      const citizen = createCitizen(`citizen-${citizenIdCounter + i}`, points)
      if (citizen) newCitizens.push(citizen)
    }

    if (newCitizens.length > 0) {
      setCitizenIdCounter((prev) => prev + newCitizens.length)
      setCitizens((prev) => [...prev, ...newCitizens])
      console.log(`Ajout de ${newCitizens.length} nouveaux citoyens (total: ${citizens.length + newCitizens.length})`)
    }
  }

  const toggleShowDestinations = () => {
    setShowDestinations(!showDestinations)
  }

  // Fonction pour vérifier si une route existe déjà entre deux points
  const routeExists = (start: any, end: any) => {
    return (
      routes.findIndex(
        (route) => (route.start === start && route.end === end) || (route.start === end && route.end === start),
      ) !== -1
    )
  }

  // Fonction pour supprimer une route
  const removeRoute = (routeIndex: number) => {
    if (routeIndex >= 0 && routeIndex < routes.length) {
      const newRoutes = [...routes]
      newRoutes.splice(routeIndex, 1)
      setRoutes(newRoutes)

      // Mettre à jour les défis liés au réseau
      updateNetworkChallenge(newRoutes)
      updateDiversityChallenge(newRoutes)
      updateConnectivityChallenge(newRoutes, points)
    }
  }

  // Modifier la fonction addRoute pour empêcher les liaisons doubles
  const addRoute = (start: any, end: any, type: TransportType) => {
    const existingRouteIndex = routes.findIndex(
      (route) => (route.start === start && route.end === end) || (route.start === end && route.end === start),
    )

    if (existingRouteIndex !== -1) {
      return false
    }

    const dx = Math.abs(start.x - end.x)
    const dy = Math.abs(start.y - end.y)
    const distance = Math.sqrt(dx * dx + dy * dy)

    const distanceLimits = {
      [TransportType.PEDESTRIAN_PATH]: 5,
      [TransportType.BIKE_LANE]: 10,
      [TransportType.SCOOTER_STATION]: 15,
      [TransportType.LIGHT_RAIL]: Number.POSITIVE_INFINITY,
    }

    if (distance > distanceLimits[type]) {
      return false
    }

    const cost = getTransportCost(type, day)
    if (resources < cost) {
      return false
    }

    const newRoutes = [...routes, { start, end, type }]
    setRoutes(newRoutes)
    setResources(resources - cost)

    updateNetworkChallenge(newRoutes)
    updateDiversityChallenge(newRoutes)
    updateConnectivityChallenge(newRoutes, points)

    return true
  }

  // Fonction pour mettre à jour le défi de réseau
  const updateNetworkChallenge = (currentRoutes: any[]) => {
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === "challenge4" && !challenge.completed) {
          const newCurrent = currentRoutes.length
          return {
            ...challenge,
            current: newCurrent,
            completed: newCurrent >= challenge.target,
          }
        }
        return challenge
      }),
    )
  }

  // Fonction pour mettre à jour le défi de diversité
  const updateDiversityChallenge = (currentRoutes: any[]) => {
    const uniqueTypes = new Set(currentRoutes.map((route) => route.type))
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === "challenge5" && !challenge.completed) {
          const newCurrent = uniqueTypes.size
          return {
            ...challenge,
            current: newCurrent,
            completed: newCurrent >= challenge.target,
          }
        }
        return challenge
      }),
    )
  }

  // Fonction pour mettre à jour le défi de connectivité
  const updateConnectivityChallenge = (currentRoutes: any[], allPoints: any[]) => {
    const graph = new Map()
    allPoints.forEach((point) => {
      graph.set(point.id, [])
    })
    currentRoutes.forEach((route) => {
      const startConnections = graph.get(route.start.id) || []
      const endConnections = graph.get(route.end.id) || []
      startConnections.push(route.end.id)
      endConnections.push(route.start.id)
      graph.set(route.start.id, startConnections)
      graph.set(route.end.id, endConnections)
    })

    const connectedPoints = [...graph.entries()].filter(([_, connections]) => connections.length > 0).length
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === "challenge8" && !challenge.completed) {
          return {
            ...challenge,
            current: connectedPoints,
            completed: connectedPoints >= challenge.target,
          }
        }
        return challenge
      }),
    )
  }

  // Fonction pour calculer le coût des transports avec augmentation progressive
  const getTransportCost = (type: TransportType, currentDay: number): number => {
    let baseCost = 0
    switch (type) {
      case TransportType.BIKE_LANE:
        baseCost = 100
        break
      case TransportType.PEDESTRIAN_PATH:
        baseCost = 50
        break
      case TransportType.SCOOTER_STATION:
        baseCost = 150
        break
      case TransportType.LIGHT_RAIL:
        baseCost = 500
        break
    }
    const inflationFactor = 1 + (currentDay - 1) * 0.05
    return Math.round(baseCost * inflationFactor)
  }

  // Modifier la fonction selectTransport pour désélectionner si pas assez d'argent
  const selectTransport = (type: TransportType) => {
    const cost = getTransportCost(type, day)
    if (resources < cost) {
      setSelectedTransport(null)
      return
    }
    setSelectedTransport(type)
  }

  // Update game loop with CO2 calculation, satisfaction check and challenges
  useEffect(() => {
    const gameInterval = setInterval(() => {
      if (!gameOver) {
        advanceTime()
      }
    }, 1000)

    const cleanupInterval = setInterval(() => {
      if (!gameOver) {
        setCitizens((prevCitizens) => {
          if (prevCitizens.length > 300) {
            return prevCitizens.slice(-200)
          }
          return prevCitizens
        })
      }
    }, 5000)

    return () => {
      clearInterval(gameInterval)
      clearInterval(cleanupInterval)
    }
  }, [time, citizens, routes, gameOver])

  // Nouvel useEffect pour ajouter 1 citoyen toutes les 10 secondes
  useEffect(() => {
    const intervalMs = 10000
    const citizenInterval = setInterval(() => {
      if (!gameOver) {
        addCitizens(1)
      }
    }, intervalMs)
    return () => clearInterval(citizenInterval)
  }, [gameOver, points, citizenIdCounter])

  // Modifier la fonction advanceTime pour améliorer la visualisation des déplacements
  const advanceTime = () => {
    const newTime = (time + 1) % 24
    setTime(newTime)

    if (newTime === 0) {
      const newDay = day + 1
      setDay(newDay)
      addCitizens(5)

      if (newDay % 1 === 0) {
        // Générer plusieurs points d'intérêt par jour (ex: 2 à 5)
        const pointsToGenerate = Math.floor(Math.random() * 2) + 1;
        let newPoints = [...points];

        for (let i = 0; i < pointsToGenerate; i++) {
          const { x, y } = generateRandomPosition(mapWidth, mapHeight, points);
          const type = Object.values(PointOfInterestType)[
            Math.floor(Math.random() * Object.values(PointOfInterestType).length)
          ] as PointOfInterestType;
          const newPoint = generatePointOfInterest(x, y, type);
          newPoints.push(newPoint);
        }
        setPoints(newPoints);

        setChallenges((prev) =>
          prev.map((challenge) => {
            if (challenge.id === "challenge8") {
              return { ...challenge, target: newPoints.length }
            }
            return challenge
          }),
        )

        const pointsAdded = Math.floor(newDay / 3)
        const citizensToAdd = 10 * pointsAdded
        addCitizens(citizensToAdd)
      }

      const satisfiedCitizens = citizens.filter((c) => c.satisfied).length
      const totalIncome = 100 + satisfiedCitizens * 10
      const maintenanceCost = Math.round(routes.length * 5 * (1 + (day - 1) * 0.1))
      const newResources = resources + totalIncome - maintenanceCost
      setResources(newResources)

      setChallenges((prev) =>
        prev.map((challenge) => {
          if (challenge.id === "challenge7" && !challenge.completed) {
            return { ...challenge, current: newResources, completed: newResources >= challenge.target }
          }
          return challenge
        }),
      )

      if (satisfaction >= 80) {
        setChallenges((prev) =>
          prev.map((challenge) => {
            if (challenge.id === "challenge2" && !challenge.completed) {
              const newCurrent = challenge.current + 1
              return { ...challenge, current: newCurrent, completed: newCurrent >= challenge.target }
            }
            return challenge
          }),
        )
      } else {
        setChallenges((prev) =>
          prev.map((challenge) => {
            if (challenge.id === "challenge2" && !challenge.completed) {
              return { ...challenge, current: 0 }
            }
            return challenge
          }),
        )
      }

      setChallenges((prev) =>
        prev.map((challenge) => {
          if (challenge.id === "challenge6" && !challenge.completed) {
            return { ...challenge, current: satisfaction, completed: satisfaction >= challenge.target }
          }
          return challenge
        }),
      )

      setChallenges((prev) =>
        prev.map((challenge) => {
          if (challenge.id === "challenge9" && !challenge.completed) {
            return { ...challenge, current: newDay, completed: newDay >= challenge.target }
          }
          return challenge
        }),
      )
    }

    // Déplacer les citoyens le long des routes et suivre les économies de CO2
    let totalCitizensMoved = 0
    let co2SavedThisTick = 0

    const updatedCitizens = citizens.map((citizen) => {
      if (citizen.location === citizen.destination) {
        const possibleDestinations = points.filter((p) => p !== citizen.location)
        const co2SavedPerTrip = citizen.transportMode ? calculateCo2Saved(citizen.transportMode) : 0
        co2SavedThisTick += co2SavedPerTrip
        if (!citizen.journeyCompleted && citizen.transportMode) {
          totalCitizensMoved++
        }
        return {
          ...citizen,
          destination: possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)],
          waitingTime: 0,
          journeyCompleted: true,
          co2Impact: co2SavedPerTrip,
          path: [],
        }
      }

      if (citizen.path && citizen.path.length > 0) {
        const nextStop = citizen.path[0]
        return {
          ...citizen,
          location: nextStop,
          path: citizen.path.slice(1),
          satisfied: true,
          waitingTime: 0,
        }
      }

      const path = findPath(citizen.location, citizen.destination, routes, points)
      if (path.length > 0) {
        const nextStop = path[0]
        const routeUsed = routes.find(
          (route) =>
            (route.start === citizen.location && route.end === nextStop) ||
            (route.end === citizen.location && route.start === nextStop),
        )
        const transportMode = routeUsed ? routeUsed.type : null
        const satisfactionPenalty = path.length > 2
        return {
          ...citizen,
          location: nextStop,
          path: path.slice(1),
          transportMode,
          satisfied: !satisfactionPenalty,
          waitingTime: 0,
        }
      } else {
        const newWaitingTime = citizen.waitingTime + 1
        const satisfactionThreshold = Math.max(3 - Math.floor(day / 5), 1)
        return {
          ...citizen,
          waitingTime: newWaitingTime,
          satisfied: newWaitingTime < satisfactionThreshold,
        }
      }
    })

    function findPath(start, end, routes, points) {
      if (start === end) return []
      const queue = [[start]]
      const visited = new Set([start.id])
      while (queue.length > 0) {
        const path = queue.shift()
        const currentPoint = path[path.length - 1]
        const connectedRoutes = routes.filter((route) => route.start === currentPoint || route.end === currentPoint)
        for (const route of connectedRoutes) {
          const nextPoint = route.start === currentPoint ? route.end : route.start
          if (nextPoint === end) {
            return [...path.slice(1), nextPoint]
          }
          if (!visited.has(nextPoint.id)) {
            visited.add(nextPoint.id)
            queue.push([...path, nextPoint])
          }
        }
      }
      return []
    }

    if (co2SavedThisTick > 0) {
      const newCo2Saved = co2Saved + co2SavedThisTick
      setCo2Saved(newCo2Saved)
      setChallenges((prev) =>
        prev.map((challenge) => {
          if (challenge.id === "challenge3" && !challenge.completed) {
            const newCurrent = challenge.current + co2SavedThisTick
            return { ...challenge, current: newCurrent, completed: newCurrent >= challenge.target }
          }
          return challenge
        }),
      )
    }

    if (totalCitizensMoved > 0) {
      setChallenges((prev) =>
        prev.map((challenge) => {
          if (challenge.id === "challenge1" && !challenge.completed) {
            const newCurrent = challenge.current + totalCitizensMoved
            return { ...challenge, current: newCurrent, completed: newCurrent >= challenge.target }
          }
          return challenge
        }),
      )
    }

    const newSatisfaction = calculateSatisfaction(updatedCitizens)
    setSatisfaction(newSatisfaction)

    // Si la satisfaction reste en dessous de 30% pendant 5 tics consécutifs, fin du jeu
    if (newSatisfaction < 30 && day > 1) {
      const newLowSatisfactionCounter = lowSatisfactionCounter + 1
      setLowSatisfactionCounter(newLowSatisfactionCounter)
      if (newLowSatisfactionCounter >= 5) {
        setGameOver(true)
      }
    } else {
      setLowSatisfactionCounter(0)
    }

    const satisfactionPenalty = newSatisfaction < 50 ? -50 : 0
    const newScore = calculateScore(updatedCitizens, routes, newSatisfaction) + satisfactionPenalty
    setScore(score + newScore)

    const satisfiedCitizensCount = updatedCitizens.filter((c) => c.satisfied).length
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id === "challenge10" && !challenge.completed) {
          const newCurrent = Math.max(satisfiedCitizensCount, challenge.current)
          return { ...challenge, current: newCurrent, completed: newCurrent >= challenge.target }
        }
        return challenge
      }),
    )

    setCitizens(updatedCitizens)
  }

  // Calculate CO2 saved based on transport mode
  const calculateCo2Saved = (transportMode: TransportType): number => {
    switch (transportMode) {
      case TransportType.BIKE_LANE:
        return 200
      case TransportType.PEDESTRIAN_PATH:
        return 200
      case TransportType.SCOOTER_STATION:
        return 180
      case TransportType.LIGHT_RAIL:
        return 160
      default:
        return 0
    }
  }

  return (
    <GameContext.Provider
      value={{
        map,
        points,
        routes,
        citizens,
        selectedTransport,
        satisfaction,
        score,
        resources,
        day,
        time,
        co2Saved,
        challenges,
        addRoute,
        removeRoute,
        selectTransport,
        advanceTime,
        showDestinations,
        toggleShowDestinations,
        getTransportCost,
        hoveredRoute,
        setHoveredRoute,
        gameOver,
        setGameOver,
      }}
    >
      {children}
      {gameOver && (
        <GameOverPopup
          day={day}
          co2Saved={co2Saved}
          citizensCount={citizens.length}
          score={score}
          onReset={resetGame}
        />
      )}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
