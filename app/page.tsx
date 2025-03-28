"use client"

import { useEffect, useState } from "react"
import GameBoard from "@/components/game-board"
import ControlPanel from "@/components/control-panel"
import StatsPanel from "@/components/stats-panel"
import { GameProvider, useGame } from "@/components/game-context"
import { Bike, FootprintsIcon, BikeIcon as Scooter, Train } from "lucide-react"

function GameOverScreen({
  score,
  co2Saved,
  day,
  onRestart,
}: {
  score: number
  co2Saved: number
  day: number
  onRestart: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Partie terminée</h2>
        <p className="mb-4 text-slate-600">Vous avez tenu {day} jours!</p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-emerald-50 p-3 rounded-md">
            <div className="text-3xl font-bold text-emerald-600">{(co2Saved / 1000).toFixed(2)} kg</div>
            <div className="text-sm text-emerald-600">CO₂ économisé</div>
          </div>
        </div>

        <div className="mb-6 bg-amber-50 p-3 rounded-md text-left">
          <p className="text-sm text-amber-800">
            Saviez-vous que si chaque habitant remplaçait un trajet en voiture par semaine par un transport doux, nous
            pourrions réduire les émissions de CO₂ de plus de 500 kg par personne et par an ?
          </p>
        </div>

        <button
          onClick={onRestart}
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors w-full"
        >
          Rejouer
        </button>
      </div>
    </div>
  )
}

// Modifier la fonction GameScreen pour revenir à l'accueil en cas de game over
function GameScreen() {
  const { gameOver } = useGame()
  const [redirecting, setRedirecting] = useState(false)

  // Rediriger vers l'accueil en cas de game over
  useEffect(() => {
    if (gameOver && !redirecting) {
      setRedirecting(true)
      // Afficher un message pendant 2 secondes avant de rediriger
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }, [gameOver, redirecting])

  return (
    <>
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Partie terminée</h2>
            <p className="mb-4">La satisfaction des citoyens est restée trop basse!</p>
            <p className="text-sm text-slate-600">Retour à l'accueil...</p>
          </div>
        </div>
      )}
    </>
  )
}

export default function TCLSimulator() {
  const [gameStarted, setGameStarted] = useState(false)

  // Améliorer le design de la page d'accueil et du header
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-3 shadow-lg">
        <div className="container mx-auto flex items-center">
          <div>
            <h1 className="text-2xl font-bold">Ecocity</h1>
            <p className="text-sm opacity-90">Optimisez les transports doux pour une ville plus verte</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block text-xs bg-white/20 px-3 py-1 rounded-full">Version 1.0</div>
          </div>
        </div>
      </header>

      {!gameStarted ? (
        <div className="container mx-auto flex-1 flex items-center justify-center p-4 overflow-auto bg-gradient-to-b from-emerald-50 to-emerald-100">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="md:col-span-2 bg-emerald-600 p-8 text-white flex flex-col justify-center">
              <h2 className="text-4xl font-bold mb-4">Ecocity</h2>
              <p className="text-xl opacity-90 mb-6">Créez un réseau de transports écologiques et efficaces</p>
              <div className="hidden md:block">
              <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <FootprintsIcon className="w-5 h-5" />
                  </div>
                  <span>Voies piétonnes</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Bike className="w-5 h-5" />
                  </div>
                  <span>Pistes cyclables</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Train className="w-5 h-5" />
                  </div>
                  <span>Tramway</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Train className="w-5 h-5" />
                  </div>
                  <span>Métro</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Bienvenue dans le simulateur</h3>

              <p className="mb-6 text-slate-600">
                Devenez planificateur urbain et créez un réseau de transports doux efficace pour réduire l'utilisation
                de la voiture et satisfaire les habitants.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <h4 className="font-bold text-emerald-700 mb-2">Objectifs</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Connecter les points d'intérêt</li>
                    <li>Maintenir la satisfaction citoyenne</li>
                    <li>Réduire l'empreinte carbone</li>
                    <li>Débloquer des récompenses</li>
                  </ul>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h4 className="font-bold text-amber-700 mb-2">Attention</h4>
                  <p className="text-sm">
                    Si la satisfaction des citoyens tombe sous 30% pendant trop longtemps, vous perdez la partie!
                  </p>
                  <p className="text-sm mt-2 font-medium">Surveillez votre budget et planifiez judicieusement.</p>
                </div>
              </div>

              <button
                onClick={() => setGameStarted(true)}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md font-bold text-lg"
              >
                Commencer la simulation
              </button>

              <p className="text-xs text-center mt-4 text-slate-500">
                Version 1.0 - Ecocity: Simulation urbaine écologique
              </p>
            </div>
          </div>
        </div>
      ) : (
        <GameProvider>
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 bg-white overflow-hidden flex items-center justify-center">
              <GameBoard />
            </div>
            <div className="w-full md:w-80 flex flex-col gap-2 p-2 overflow-auto">
              <ControlPanel />
              <StatsPanel />
            </div>
          </div>
        </GameProvider>
      )}
    </div>
  )
}

