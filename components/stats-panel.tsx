"use client"

import { useGame } from "./game-context"
import type { TransportType } from "@/lib/types"

// Ajouter un indicateur des coûts de maintenance
export default function StatsPanel() {
  const { satisfaction, score, citizens, routes, co2Saved, challenges, day, resources } = useGame()

  // Calculer les citoyens satisfaits
  const satisfiedCitizens = citizens.filter((c) => c.satisfied).length

  // Calculer les revenus totaux (simplifiés)
  const totalIncome = 100 + satisfiedCitizens * 5 // Revenu de base + revenu par citoyen

  // Calculer les coûts de maintenance
  const maintenanceCost = Math.round(routes.length * 5 * (1 + (day - 1) * 0.1))

  // Calculer le bilan quotidien
  const dailyBalance = totalIncome - maintenanceCost

  // Calculate transport usage statistics
  const transportStats = routes.reduce(
    (acc, route) => {
      acc[route.type] = (acc[route.type] || 0) + 1
      return acc
    },
    {} as Record<TransportType, number>,
  )

  // Calculate citizen satisfaction
  const satisfactionPercentage = citizens.length > 0 ? Math.round((satisfiedCitizens / citizens.length) * 100) : 100

  // Calculate transport mode distribution
  const transportModes = citizens.reduce(
    (acc, citizen) => {
      if (citizen.transportMode) {
        acc[citizen.transportMode] = (acc[citizen.transportMode] || 0) + 1
      } else {
        acc.waiting = (acc.waiting || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  // Environmental message system
  const getEnvironmentalMessage = () => {
    if (co2Saved > 0) {
      return `Vous avez économisé ${co2Saved.toFixed(0)}g de CO2 grâce aux transports doux !`
    }
    return "Créez des connexions pour réduire l'empreinte carbone !"
  }

  // Ajouter une section pour les finances dans le panneau de statistiques
  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <h2 className="font-bold text-base mb-2">Statistiques</h2>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium">Satisfaction</span>
            <span className="text-xs font-medium">{satisfactionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${satisfactionPercentage}%`,
                backgroundColor:
                  satisfactionPercentage > 70
                    ? "#10b981" // Emerald-500
                    : satisfactionPercentage > 40
                      ? "#f59e0b" // Amber-500
                      : "#ef4444", // Red-500
              }}
            ></div>
          </div>
        </div>

        {/* Remplacer le score par le CO2 économisé comme métrique principale */}
        {/* Modifier la section qui affiche les statistiques */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-emerald-50 p-1 rounded">
            <div className="text-xs text-slate-500">CO₂ économisé</div>
            <div className="font-bold text-sm text-emerald-600">{(co2Saved / 1000).toFixed(2)} kg</div>
          </div>
          <div className="bg-slate-50 p-1 rounded">
            <div className="text-xs text-slate-500">Citoyens</div>
            <div className="font-bold text-sm">{citizens.length}</div>
          </div>
          <div className="bg-slate-50 p-1 rounded">
            <div className="text-xs text-slate-500">Jour</div>
            <div className="font-bold text-sm">{day}</div>
          </div>
        </div>

        {/* Section finances simplifiée */}
        <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
          <h3 className="text-xs font-medium text-blue-700 mb-1">Finances</h3>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between">
              <span>Revenus:</span>
              <span className="text-emerald-600">+{totalIncome} €/jour</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance:</span>
              <span className="text-red-600">-{maintenanceCost} €/jour</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1 font-medium">
              <span>Bilan:</span>
              <span className={dailyBalance >= 0 ? "text-emerald-600" : "text-red-600"}>
                {dailyBalance > 0 ? "+" : ""}
                {dailyBalance} €/jour
              </span>
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-1 italic">Chaque citoyen satisfait rapporte 10€ par jour!</div>
        </div>

        {/* Supprimer ou réduire l'indicateur CO2 séparé puisqu'il est maintenant la métrique principale */}
        {/* Remplacer la section de l'indicateur CO2 par une version plus simple */}
        {/* Indicateur CO2 avec animation - version simplifiée */}

        {/* Section des défis */}
        <div>
          <h3 className="text-xs font-medium mb-1">Défis</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`p-1 rounded-md border ${
                  challenge.completed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium">
                    {challenge.description}
                    {challenge.completed && <span className="ml-1 text-emerald-500">✓</span>}
                  </div>
                  <div className="text-xs font-bold">
                    {challenge.current}/{challenge.target}
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%`,
                      backgroundColor: challenge.completed ? "#10b981" : "#6366f1",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* État des citoyens */}
        <div>
          <h3 className="text-xs font-medium mb-1">État des citoyens</h3>
          <div className="grid grid-cols-2 gap-1 text-center">
            <div className="bg-emerald-100 rounded-md p-1">
              <div className="text-emerald-600 font-bold text-sm">{satisfiedCitizens}</div>
              <div className="text-xs">Satisfaits</div>
            </div>
            <div className="bg-red-100 rounded-md p-1">
              <div className="text-red-600 font-bold text-sm">{citizens.length - satisfiedCitizens}</div>
              <div className="text-xs">Insatisfaits</div>
            </div>
            <div className="bg-amber-100 rounded-md p-1 col-span-2">
              <div className="text-amber-600 font-bold text-sm">{citizens.filter((c) => c.waitingTime > 0).length}</div>
              <div className="text-xs">En attente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

