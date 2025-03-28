"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { useGame } from "./game-context"
import { TransportType, PointOfInterestType } from "@/lib/types"

// Enhance the game board with citizen counts, destination indicators, and waiting indicators
export default function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    map,
    points,
    routes,
    citizens,
    selectedTransport,
    addRoute,
    removeRoute,
    showDestinations,
    toggleShowDestinations,
    hoveredRoute,
    setHoveredRoute,
  } = useGame()

  const [selectedPoint, setSelectedPoint] = useState<any>(null)
  const [hoveredPoint, setHoveredPoint] = useState<any>(null)
  const [baseScale, setBaseScale] = useState(25) // Taille de base de chaque cellule
  const [clickableRouteAreas, setClickableRouteAreas] = useState<
    Array<{ index: number; midX: number; midY: number; radius: number }>
  >([])

  // Ajouter un message d'erreur pour informer l'utilisateur des restrictions de distance
  // Ajouter cet état au début du composant GameBoard, après les autres états:

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ajouter un gestionnaire d'événements pour la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPoint(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Réorganiser l'ordre de dessin pour que les points soient au-dessus des routes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Ajuster la taille du canvas pour qu'il tienne sur l'écran sans scrolling
    const containerWidth = window.innerWidth > 1200 ? 750 : window.innerWidth * 0.55
    const containerHeight = window.innerHeight * 0.7

    // Calculer le scale optimal pour que la carte tienne dans le conteneur
    const optimalScaleX = containerWidth / map.width
    const optimalScaleY = containerHeight / map.height
    const optimalScale = Math.min(optimalScaleX, optimalScaleY, 25) // Maximum 25px par cellule

    // Mettre à jour le scale de base si nécessaire
    if (baseScale !== optimalScale) {
      setBaseScale(optimalScale)
    }

    // Appliquer le niveau de zoom au scale
    const effectiveScale = optimalScale

    // Définir la taille du canvas
    canvas.width = map.width * effectiveScale
    canvas.height = map.height * effectiveScale

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dessiner la grille (plus légère)
    ctx.strokeStyle = "#e5e7eb40" // Plus transparent
    ctx.lineWidth = 0.5
    for (let x = 0; x <= map.width; x++) {
      ctx.beginPath()
      ctx.moveTo(x * effectiveScale, 0)
      ctx.lineTo(x * effectiveScale, map.height * effectiveScale)
      ctx.stroke()
    }

    for (let y = 0; y <= map.height; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * effectiveScale)
      ctx.lineTo(map.width * effectiveScale, y * effectiveScale)
      ctx.stroke()
    }

    // Préparer les zones cliquables pour les routes
    const newClickableRouteAreas = []

    // 1. DESSINER D'ABORD LES ROUTES
    routes.forEach((route, index) => {
      const startX = route.start.x * effectiveScale + effectiveScale / 2
      const startY = route.start.y * effectiveScale + effectiveScale / 2
      const endX = route.end.x * effectiveScale + effectiveScale / 2
      const endY = route.end.y * effectiveScale + effectiveScale / 2

      // Déterminer si la route est plutôt horizontale ou verticale
      const isHorizontal = Math.abs(endX - startX) > Math.abs(endY - startY)

      ctx.beginPath()

      // Points de contrôle pour le tracé
      let midX, midY, realMidX, realMidY

      if (isHorizontal) {
        // Route horizontale puis verticale
        midX = endX
        midY = startY
      } else {
        // Route verticale puis horizontale
        midX = startX
        midY = endY
      }

      ctx.moveTo(startX, startY)
      ctx.lineTo(midX, midY)
      ctx.lineTo(endX, endY)

      // Calculer le point médian réel de la route (pour la zone cliquable)
      // Utiliser le milieu du segment intermédiaire pour une meilleure précision
      realMidX = (midX + startX) / 2
      realMidY = (midY + startY) / 2

      // Si le segment intermédiaire est trop court, utiliser le second segment
      if (Math.abs(midX - startX) < 10 && Math.abs(midY - startY) < 10) {
        realMidX = (midX + endX) / 2
        realMidY = (midY + endY) / 2
      }

      // Définir le style de ligne selon le type de transport
      switch (route.type) {
        case TransportType.BIKE_LANE:
          ctx.strokeStyle = hoveredRoute === index ? "#047857" : "#10b981" // Emerald-500/700
          ctx.lineWidth = hoveredRoute === index ? 4 : 3
          break
        case TransportType.PEDESTRIAN_PATH:
          ctx.strokeStyle = hoveredRoute === index ? "#4338ca" : "#6366f1" // Indigo-500/700
          ctx.lineWidth = hoveredRoute === index ? 3 : 2
          ctx.setLineDash([5, 3])
          break
        case TransportType.SCOOTER_STATION:
          ctx.strokeStyle = hoveredRoute === index ? "#b45309" : "#f59e0b" // Amber-500/700
          ctx.lineWidth = hoveredRoute === index ? 4 : 3
          break
        case TransportType.LIGHT_RAIL:
          ctx.strokeStyle = hoveredRoute === index ? "#b91c1c" : "#ef4444" // Red-500/700
          ctx.lineWidth = hoveredRoute === index ? 5 : 4
          break
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Ajouter la zone cliquable pour cette route avec un rayon plus large
      newClickableRouteAreas.push({
        index,
        midX: realMidX,
        midY: realMidY,
        radius: 40, // Zone plus large pour faciliter la suppression
      })

      // Si la route est survolée, ajouter un bouton de suppression
      if (hoveredRoute === index) {
        // Dessiner un cercle de fond pour l'icône - plus grand
        ctx.beginPath()
        ctx.arc(realMidX, realMidY, 18, 0, Math.PI * 2) // Cercle plus grand
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.fill()
        ctx.strokeStyle = "#ef4444" // Rouge
        ctx.lineWidth = 2 // Épaisseur de la bordure
        ctx.stroke()

        // Dessiner une icône de suppression (X) plus grande
        ctx.beginPath()
        ctx.moveTo(realMidX - 10, realMidY - 10)
        ctx.lineTo(realMidX + 10, realMidY + 10)
        ctx.moveTo(realMidX + 10, realMidY - 10)
        ctx.lineTo(realMidX - 10, realMidY + 10)
        ctx.strokeStyle = "#ef4444" // Rouge
        ctx.lineWidth = 3 // Ligne plus épaisse
        ctx.stroke()
      }
    })

    // Mettre à jour les zones cliquables
    setClickableRouteAreas(newClickableRouteAreas)

    // Compter les citoyens à chaque point d'intérêt
    const citizenCounts = points.reduce(
      (acc, point) => {
        acc[point.id] = citizens.filter((c) => c.location === point).length
        return acc
      },
      {} as Record<string, number>,
    )

    // Regrouper les citoyens par destination pour la visualisation
    const destinationCounts = points.reduce(
      (acc, point) => {
        acc[point.id] = citizens.filter((c) => c.destination === point).length
        return acc
      },
      {} as Record<string, number>,
    )

    // Créer une carte des trajets demandés pour identifier les connexions les plus demandées
    const demandedRoutes = new Map()
    citizens.forEach((citizen) => {
      if (!citizen.location || !citizen.destination) return

      // Créer une clé unique pour chaque paire origine-destination
      const key = `${citizen.location.id}-${citizen.destination.id}`
      if (!demandedRoutes.has(key)) {
        demandedRoutes.set(key, { count: 0, start: citizen.location, end: citizen.destination })
      }

      const route = demandedRoutes.get(key)
      route.count++
    })

    // Convertir la carte en tableau et trier par demande
    const sortedRoutes = Array.from(demandedRoutes.values()).sort((a, b) => b.count - a.count)

    // 2. DESSINER LES TRAJETS DEMANDÉS
    if (showDestinations && sortedRoutes.length > 0) {
      // Limiter aux 3 trajets les plus demandés
      const topRoutes = sortedRoutes.slice(0, 3)

      topRoutes.forEach((route, index) => {
        const startX = route.start.x * effectiveScale + effectiveScale / 2
        const startY = route.start.y * effectiveScale + effectiveScale / 2
        const endX = route.end.x * effectiveScale + effectiveScale / 2
        const endY = route.end.y * effectiveScale + effectiveScale / 2

        // Dessiner une ligne en pointillés pour montrer le trajet demandé
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)

        // Utiliser des couleurs différentes pour les 3 premiers trajets
        const colors = ["rgba(220, 38, 38, 0.7)", "rgba(234, 88, 12, 0.7)", "rgba(217, 119, 6, 0.7)"]
        ctx.strokeStyle = colors[index]
        ctx.lineWidth = 2
        ctx.setLineDash([5, 3])
        ctx.stroke()
        ctx.setLineDash([])

        // Ajouter un indicateur de priorité
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2

        ctx.beginPath()
        ctx.arc(midX, midY, 10, 0, Math.PI * 2)
        ctx.fillStyle = colors[index]
        ctx.fill()

        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 10px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText((index + 1).toString(), midX, midY)
      })
    }

    // Initialiser journeyMap en dehors de la boucle pour stocker les données entre les rendus
    const journeyMap = new Map()

    // Mettre à jour journeyMap avec les données de satisfaction et d'attente
    citizens.forEach((citizen) => {
      if (!citizen.location || !citizen.destination) return

      const key = `${citizen.location.id}-${citizen.destination.id}`
      if (!journeyMap.has(key)) {
        journeyMap.set(key, { count: 0, satisfied: 0, unsatisfied: 0, waiting: 0 })
      }

      const journey = journeyMap.get(key)
      journey.count++

      if (!citizen.satisfied) {
        journey.unsatisfied++
      }

      if (citizen.waiting) {
        journey.waiting++
      }
    })

    // 3. DESSINER LES FLUX DE CITOYENS
    journeyMap.forEach((journey, key) => {
      const [startId, endId] = key.split("-")
      const startPoint = points.find((p) => p.id === startId)
      const endPoint = points.find((p) => p.id === endId)

      if (!startPoint || !endPoint) return

      const startX = startPoint.x * effectiveScale + effectiveScale / 2
      const startY = startPoint.y * effectiveScale + effectiveScale / 2
      const endX = endPoint.x * effectiveScale + effectiveScale / 2
      const endY = endPoint.y * effectiveScale + effectiveScale / 2

      // Ne dessiner que si le nombre de citoyens est significatif ou si showDestinations est activé
      if (journey.count > 1 || showDestinations) {
        // Calculer un décalage pour éviter que les lignes ne se superposent
        const offsetX = (Math.random() - 0.5) * 5
        const offsetY = (Math.random() - 0.5) * 5

        // Dessiner une ligne de flux avec une épaisseur proportionnelle au nombre de citoyens
        ctx.beginPath()
        ctx.moveTo(startX + offsetX, startY + offsetY)
        ctx.lineTo(endX + offsetX, endY + offsetY)

        // Couleur basée sur la satisfaction
        if (journey.unsatisfied > journey.count / 2) {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.4)" // Rouge pour insatisfait
        } else if (journey.waiting > journey.count / 2) {
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)" // Ambre pour en attente
        } else {
          ctx.strokeStyle = "rgba(16, 185, 129, 0.4)" // Vert pour satisfait
        }

        ctx.lineWidth = Math.min(1 + journey.count / 3, 5) // Épaisseur proportionnelle au nombre de citoyens
        ctx.setLineDash([2, 2])
        ctx.stroke()
        ctx.setLineDash([])

        // Dessiner une petite icône au milieu pour indiquer l'état du flux
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2

        // Dessiner un indicateur statique au lieu d'une animation
        if (journey.unsatisfied > journey.count / 2) {
          // Indicateur d'insatisfaction (X rouge)
          ctx.beginPath()
          ctx.moveTo(midX - 3, midY - 3)
          ctx.lineTo(midX + 3, midY + 3)
          ctx.moveTo(midX + 3, midY - 3)
          ctx.lineTo(midX - 3, midY + 3)
          ctx.strokeStyle = "rgba(239, 68, 68, 0.8)"
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (journey.waiting > journey.count / 2) {
          // Indicateur d'attente (point d'exclamation orange)
          ctx.beginPath()
          ctx.arc(midX, midY, 3, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(245, 158, 11, 0.8)"
          ctx.fill()
        } else if (journey.count > 3) {
          // Indicateur de flux important (flèche verte)
          ctx.beginPath()
          ctx.moveTo(midX - 4, midY)
          ctx.lineTo(midX + 4, midY)
          ctx.lineTo(midX, midY + 4)
          ctx.closePath()
          ctx.fillStyle = "rgba(16, 185, 129, 0.8)"
          ctx.fill()
        }
      }
    })

    // 4. DESSINER LES CHEMINS EMPRUNTÉS
    citizens.forEach((citizen) => {
      if (citizen.path && citizen.path.length > 0) {
        // Dessiner le chemin complet que le citoyen va emprunter
        const fullPath = [citizen.location, ...citizen.path]

        for (let i = 0; i < fullPath.length - 1; i++) {
          const startPoint = fullPath[i]
          const endPoint = fullPath[i + 1]

          const startX = startPoint.x * effectiveScale + effectiveScale / 2
          const startY = startPoint.y * effectiveScale + effectiveScale / 2
          const endX = endPoint.x * effectiveScale + effectiveScale / 2
          const endY = endPoint.y * effectiveScale + effectiveScale / 2

          // Dessiner une ligne pointillée fine pour représenter le chemin
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          ctx.strokeStyle = "rgba(59, 130, 246, 0.4)" // Bleu avec transparence
          ctx.lineWidth = 1
          ctx.setLineDash([2, 2])
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Dessiner un petit cercle pour représenter le citoyen
        const citizenX = citizen.location.x * effectiveScale + effectiveScale / 2
        const citizenY = citizen.location.y * effectiveScale + effectiveScale / 2

        ctx.beginPath()
        ctx.arc(citizenX, citizenY, 3, 0, Math.PI * 2)
        ctx.fillStyle = citizen.satisfied ? "rgba(16, 185, 129, 0.8)" : "rgba(239, 68, 68, 0.8)"
        ctx.fill()
      }
    })

    // In the canvasRef effect, add a minPadding variable
    const minPadding = 2 // Minimum padding from the edge

    // 5. DESSINER LES POINTS D'INTÉRÊT EN DERNIER (pour qu'ils soient au-dessus)
    points.forEach((point) => {
      const x = point.x * effectiveScale + effectiveScale / 2
      const y = point.y * effectiveScale + effectiveScale / 2
      const radius = effectiveScale / 2.5 // Augmenté pour des points plus grands

      // Effet de lueur pour les stations occupées
      if (citizenCounts[point.id] > 5) {
        ctx.beginPath()
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)

      // Couleur selon le type de point
      switch (point.type) {
        case PointOfInterestType.RESIDENTIAL:
          ctx.fillStyle = "#60a5fa" // Blue-400
          break
        case PointOfInterestType.OFFICE:
          ctx.fillStyle = "#f87171" // Red-400
          break
        case PointOfInterestType.SCHOOL:
          ctx.fillStyle = "#fbbf24" // Amber-400
          break
        case PointOfInterestType.STATION:
          ctx.fillStyle = "#a78bfa" // Violet-400
          break
        case PointOfInterestType.LEISURE:
          ctx.fillStyle = "#4ade80" // Green-400
          break
      }

      // Mettre en évidence le point sélectionné ou survolé
      if (point === selectedPoint) {
        ctx.fillStyle = "#8b5cf6" // Violet-500
        ctx.lineWidth = 3
        ctx.strokeStyle = "#ffffff"
        ctx.stroke()
      } else if (point === hoveredPoint) {
        ctx.lineWidth = 2
        ctx.strokeStyle = "#ffffff"
        ctx.stroke()
      }

      ctx.fill()

      // Dessiner l'icône ou le label
      ctx.fillStyle = "#ffffff"
      ctx.font = "20px sans-serif" // Augmenté pour des icônes plus grandes
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      let icon = ""
      switch (point.type) {
        case PointOfInterestType.RESIDENTIAL:
          icon = "🏠"
          break
        case PointOfInterestType.OFFICE:
          icon = "🏢"
          break
        case PointOfInterestType.SCHOOL:
          icon = "🏫"
          break
        case PointOfInterestType.STATION:
          icon = "🚉"
          break
        case PointOfInterestType.LEISURE:
          icon = "🏞️"
          break
      }

      ctx.fillText(icon, x, y)

      // Afficher le nombre de citoyens avec un fond pour meilleure visibilité
      if (citizenCounts[point.id] > 0) {
        const countText = citizenCounts[point.id].toString()
        const countY = y - radius - 5

        // Ajouter un fond pour le nombre
        ctx.beginPath()
        ctx.arc(x, countY, 8, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
        ctx.fill()

        // Afficher le nombre
        ctx.font = "bold 10px sans-serif"
        ctx.fillStyle = "#ffffff"
        ctx.fillText(countText, x, countY)
      }

      // Afficher les indicateurs de destination si activé
      if (showDestinations && destinationCounts[point.id] > 0) {
        ctx.font = "bold 10px sans-serif"
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2

        // Dessiner une petite flèche pointant vers cette destination
        const arrowY = y + radius + 10

        ctx.beginPath()
        ctx.moveTo(x, arrowY)
        ctx.lineTo(x - 5, arrowY + 5)
        ctx.lineTo(x + 5, arrowY + 5)
        ctx.closePath()
        ctx.fillStyle = "#ffd700" // Or
        ctx.fill()

        // Afficher le nombre de destinations avec un fond
        const destY = arrowY + 12
        const destText = destinationCounts[point.id].toString()

        // Ajouter un fond pour le nombre
        ctx.beginPath()
        ctx.arc(x, destY, 8, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 215, 0, 0.6)" // Or semi-transparent
        ctx.fill()

        // Afficher le nombre
        ctx.fillStyle = "#ffffff"
        ctx.fillText(destText, x, destY)
      }
    })

    // 6. DESSINER LA ROUTE POTENTIELLE
    if (selectedPoint && hoveredPoint && selectedPoint !== hoveredPoint) {
      const startX = selectedPoint.x * effectiveScale + effectiveScale / 2
      const startY = selectedPoint.y * effectiveScale + effectiveScale / 2
      const endX = hoveredPoint.x * effectiveScale + effectiveScale / 2
      const endY = hoveredPoint.y * effectiveScale + effectiveScale / 2

      // Déterminer si la route est plutôt horizontale ou verticale
      const isHorizontal = Math.abs(endX - startX) > Math.abs(endY - startY)

      ctx.beginPath()

      // Utiliser des lignes brisées avec des angles à 90° pour un style "métro"
      if (isHorizontal) {
        // Route principalement horizontale: dessiner une ligne horizontale puis verticale
        const midX = endX
        const midY = startY

        ctx.moveTo(startX, startY)
        ctx.lineTo(midX, midY)
        ctx.lineTo(endX, endY)
      } else {
        // Route principalement verticale: dessiner une ligne verticale puis horizontale
        const midX = startX
        const midY = endY

        ctx.moveTo(startX, startY)
        ctx.lineTo(midX, midY)
        ctx.lineTo(endX, endY)
      }

      // Couleur selon le transport sélectionné
      if (selectedTransport) {
        switch (selectedTransport) {
          case TransportType.BIKE_LANE:
            ctx.strokeStyle = "rgba(16, 185, 129, 0.6)" // Emerald avec transparence
            break
          case TransportType.PEDESTRIAN_PATH:
            ctx.strokeStyle = "rgba(99, 102, 241, 0.6)" // Indigo avec transparence
            break
          case TransportType.SCOOTER_STATION:
            ctx.strokeStyle = "rgba(245, 158, 11, 0.6)" // Amber avec transparence
            break
          case TransportType.LIGHT_RAIL:
            ctx.strokeStyle = "rgba(239, 68, 68, 0.6)" // Red avec transparence
            break
          default:
            ctx.strokeStyle = "rgba(156, 163, 175, 0.6)" // Gray avec transparence
        }
      } else {
        ctx.strokeStyle = "rgba(156, 163, 175, 0.6)" // Gray avec transparence
      }

      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [
    map,
    points,
    routes,
    citizens,
    selectedPoint,
    hoveredPoint,
    baseScale,
    showDestinations,
    selectedTransport,
    hoveredRoute,
  ])

  // Modifier la fonction handleCanvasClick pour donner la priorité aux points d'intérêt plutôt qu'aux routes:
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculer le scale effectif
    const effectiveScale = baseScale

    // Convertir les coordonnées de la souris en coordonnées de la grille
    const x = Math.floor(mouseX / effectiveScale)
    const y = Math.floor(mouseY / effectiveScale)

    // Vérifier d'abord si on a cliqué sur un point d'intérêt (priorité aux points)
    const clickedPoint = points.find((point) => {
      // Ajouter une marge de tolérance pour faciliter le clic
      const dx = x - point.x
      const dy = y - point.y
      // Distance au carré pour éviter le calcul de racine carrée
      const distanceSquared = dx * dx + dy * dy
      // Considérer un clic valide si on est à moins de 0.7 unités du centre
      return distanceSquared <= 0.7
    })

    if (clickedPoint) {
      if (selectedPoint && selectedPoint !== clickedPoint && selectedTransport) {
        // Calculer la distance entre les points
        const dx = Math.abs(selectedPoint.x - clickedPoint.x)
        const dy = Math.abs(selectedPoint.y - clickedPoint.y)
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Create a route between selected point and clicked point
        const routeCreated = addRoute(selectedPoint, clickedPoint, selectedTransport)

        if (routeCreated) {
          // Désélectionner le point après avoir créé une route
          setSelectedPoint(null)
        } else {
          // Si la route n'a pas été créée, afficher un message d'erreur approprié
          const distanceLimits = {
            [TransportType.PEDESTRIAN_PATH]: 5,
            [TransportType.BIKE_LANE]: 10,
            [TransportType.SCOOTER_STATION]: 15,
            [TransportType.LIGHT_RAIL]: Number.POSITIVE_INFINITY,
          }

          if (distance > distanceLimits[selectedTransport]) {
            showTemporaryError(
              `Distance trop grande pour ${
                selectedTransport === TransportType.PEDESTRIAN_PATH
                  ? "les piétons"
                  : selectedTransport === TransportType.BIKE_LANE
                    ? "les vélos"
                    : selectedTransport === TransportType.SCOOTER_STATION
                      ? "le tramway"
                      : "ce transport"
              }`,
            )
          }
        }
      } else {
        // Select this point
        setSelectedPoint(clickedPoint)
      }
      return // Sortir de la fonction après avoir traité le clic sur un point
    }

    // Si on n'a pas cliqué sur un point, vérifier si on a cliqué sur une route
    const clickedRouteArea = clickableRouteAreas.find((area) => {
      const dx = mouseX - area.midX
      const dy = mouseY - area.midY
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= area.radius
    })

    if (clickedRouteArea) {
      removeRoute(clickedRouteArea.index)
      setHoveredRoute(null)
      return
    }

    // Clicked on empty space, deselect
    setSelectedPoint(null)
  }

  // Puis ajouter cette fonction pour afficher les messages d'erreur temporaires:

  const showTemporaryError = (message: string) => {
    setErrorMessage(message)

    // Effacer tout timeout existant
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }

    // Définir un nouveau timeout pour effacer le message après 3 secondes
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage(null)
    }, 3000)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculer le scale effectif
    const effectiveScale = baseScale

    // Convertir les coordonnées de la souris en coordonnées de la grille
    const x = Math.floor(mouseX / effectiveScale)
    const y = Math.floor(mouseY / effectiveScale)

    // Find if we're hovering over a point
    const point = points.find((point) => point.x === x && point.y === y)
    setHoveredPoint(point || null)

    // Vérifier si on survole le milieu d'une route (pour la suppression)
    let hoveredRouteIndex = null

    // Vérifier si on est sur une zone cliquable de route
    for (const area of clickableRouteAreas) {
      const dx = mouseX - area.midX
      const dy = mouseY - area.midY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= area.radius) {
        hoveredRouteIndex = area.index
        break
      }
    }

    setHoveredRoute(hoveredRouteIndex)
  }

  // Request animation frame for continuous updates
  useEffect(() => {
    let animationFrameId: number

    const animate = () => {
      // Force re-render for animations
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const toggleDestinations = useCallback(() => {
    toggleShowDestinations()
  }, [toggleShowDestinations])

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-50" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className="cursor-pointer max-w-full max-h-[75vh]"
      />

      <div className="absolute bottom-4 left-4 bg-white p-2 rounded-md shadow-md text-xs">
        <div className="font-bold mb-1">Légende:</div>
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-400"></span>
          <span>🏠 Habitations</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-400"></span>
          <span>🏢 Bureaux</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span>
          <span>🏫 Écoles</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-block w-3 h-3 rounded-full bg-violet-400"></span>
          <span>🚉 Stations</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-400"></span>
          <span>🏞️ Loisirs</span>
        </div>
      </div>

      {/* Indicateur du nombre total de citoyens */}
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold">Citoyens actifs:</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">{citizens.length}</span>
        </div>
      </div>

      {/* Bouton pour afficher/masquer les destinations avec texte plus explicite */}
      <button
        onClick={toggleDestinations}
        className="absolute top-4 right-4 bg-white p-2 rounded-md shadow-md flex items-center gap-2 text-sm hover:bg-slate-50"
      >
        {showDestinations ? <>Masquer trajets</> : <>Afficher trajets</>}
      </button>

      {/* Message d'erreur temporaire */}
      {errorMessage && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md shadow-md text-sm">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

