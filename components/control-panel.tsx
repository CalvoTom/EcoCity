"use client"

import { useState, useEffect, useRef } from "react"
import { useGame } from "./game-context"
import { TransportType } from "@/lib/types"
import { Bike, FootprintsIcon, Train, Volume2, VolumeX, Info } from "lucide-react"

// Modifier la fonction pour afficher les coûts qui augmentent avec le temps
export default function ControlPanel() {
  const { selectedTransport, selectTransport, resources, day, time, getTransportCost } = useGame()

  const [soundEnabled, setSoundEnabled] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const audioContext = useRef<AudioContext | null>(null)
  const soundsLoaded = useRef<boolean>(false)
  const sounds = useRef<Record<string, AudioBuffer>>({})

  // Initialiser le système audio
  useEffect(() => {
    // Créer le contexte audio seulement au clic utilisateur pour respecter les politiques des navigateurs
    const initAudio = () => {
      if (!audioContext.current) {
        try {
          audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
          loadSounds()
        } catch (e) {
          console.error("Web Audio API n'est pas supportée par ce navigateur.", e)
        }
      }
    }

    // Charger les sons
    const loadSounds = async () => {
      if (soundsLoaded.current) return

      try {
        // Créer des sons synthétiques puisque nous n'avons pas de fichiers audio
        if (audioContext.current) {
          // Son de satisfaction
          const satisfactionBuffer = await createSyntheticSound(audioContext.current, "satisfaction", 220, 0.5)
          sounds.current.satisfaction = satisfactionBuffer

          // Son d'insatisfaction
          const insatisfactionBuffer = await createSyntheticSound(audioContext.current, "insatisfaction", 110, 0.5)
          sounds.current.insatisfaction = insatisfactionBuffer

          // Son de nouvelle route
          const newRouteBuffer = await createSyntheticSound(audioContext.current, "newRoute", 440, 0.3)
          sounds.current.newRoute = newRouteBuffer

          // Son d'ambiance
          const ambianceBuffer = await createSyntheticSound(audioContext.current, "ambiance", 55, 3.0)
          sounds.current.ambiance = ambianceBuffer

          soundsLoaded.current = true
        }
      } catch (e) {
        console.error("Erreur lors du chargement des sons", e)
      }
    }

    // Créer un son synthétique
    const createSyntheticSound = (
      context: AudioContext,
      type: string,
      frequency: number,
      duration: number,
    ): Promise<AudioBuffer> => {
      return new Promise((resolve) => {
        const sampleRate = context.sampleRate
        const buffer = context.createBuffer(1, sampleRate * duration, sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < buffer.length; i++) {
          // Différents types de sons
          if (type === "satisfaction") {
            // Son ascendant
            const t = i / buffer.length
            data[i] = Math.sin(2 * Math.PI * frequency * t * (1 + t)) * Math.exp(-3 * t)
          } else if (type === "insatisfaction") {
            // Son descendant
            const t = i / buffer.length
            data[i] = Math.sin(2 * Math.PI * frequency * t * (1 - 0.5 * t)) * Math.exp(-3 * t)
          } else if (type === "newRoute") {
            // Son court et aigu
            const t = i / buffer.length
            data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-10 * t)
          } else if (type === "ambiance") {
            // Ambiance de fond
            const t = i / buffer.length
            data[i] =
              0.05 * Math.sin(2 * Math.PI * frequency * t) +
              0.03 * Math.sin(2 * Math.PI * (frequency * 1.5) * t) +
              0.02 * Math.sin(2 * Math.PI * (frequency * 2) * t)
          }
        }

        resolve(buffer)
      })
    }

    // Ajouter un écouteur pour initialiser l'audio au premier clic
    document.addEventListener("click", initAudio, { once: true })

    return () => {
      document.removeEventListener("click", initAudio)
    }
  }, [])

  // Ajouter une fonction pour jouer les sons
  const playSound = (soundName: string) => {
    if (!soundEnabled || !audioContext.current || !sounds.current[soundName]) return

    const source = audioContext.current.createBufferSource()
    source.buffer = sounds.current[soundName]
    source.connect(audioContext.current.destination)
    source.start()
  }

  const playMp3Sound = (soundFile: string) => {
    if (!soundEnabled) return;
  
    const audio = new Audio(soundFile);
    audio.play().catch((err) => console.error("Erreur lors de la lecture du son", err));
  };
  

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`
  }

  // Environmental tooltips
  const transportTooltips = {
    [TransportType.BIKE_LANE]:
      "🌱 Les pistes cyclables réduisent les émissions de CO2 à 0g/km, contre 200g/km pour une voiture.",
    [TransportType.PEDESTRIAN_PATH]:
      "🌿 La marche est le mode de transport le plus écologique avec 0 émission et des bienfaits pour la santé.",
    [TransportType.SCOOTER_STATION]: "🌎 Le tramway émet environ 20g de CO2/km, 10x moins qu'une voiture.",
    [TransportType.LIGHT_RAIL]:
      "🌍 Le métro émet environ 40g de CO2/km, mais peut transporter beaucoup plus de personnes qu'une voiture.",
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const newSoundEnabled = !prev;
  
      if (newSoundEnabled) {
        if (!audioRef.current) {
          audioRef.current = new Audio("/sounds/Urban_Calm.mp3");
          audioRef.current.loop = true; // Faire jouer en boucle
        }
        audioRef.current.play().catch((err) => console.error("Erreur de lecture du son", err));
      } else {
        audioRef.current?.pause();
      }
  
      return newSoundEnabled;
    });
  };
  

  // Ajouter un effet pour jouer l'ambiance en boucle
  useEffect(() => {
    let ambianceSource: AudioBufferSourceNode | null = null

    if (soundEnabled && audioContext.current && sounds.current.ambiance) {
      ambianceSource = audioContext.current.createBufferSource()
      ambianceSource.buffer = sounds.current.ambiance
      ambianceSource.loop = true

      const gainNode = audioContext.current.createGain()
      gainNode.gain.value = 0.2 // Volume bas

      ambianceSource.connect(gainNode)
      gainNode.connect(audioContext.current.destination)
      ambianceSource.start()
    }

    return () => {
      if (ambianceSource) {
        ambianceSource.stop()
      }
    }
  }, [soundEnabled])

  // Modifier la section d'affichage des boutons de transport pour montrer les coûts actuels
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-bold text-lg">Contrôles</h2>
          <p className="text-sm text-slate-500">Sélectionnez un type de transport</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleSound} className="p-2 rounded-full hover:bg-slate-100">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-slate-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-600" />
            )}
          </button>
          <div className="text-right">
            <div className="font-bold text-emerald-600">{resources} €</div>
            <div className="text-xs text-slate-500">
              Jour {day}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => selectTransport(TransportType.BIKE_LANE)}
          onMouseEnter={() => setActiveTooltip(TransportType.BIKE_LANE)}
          onMouseLeave={() => setActiveTooltip(null)}
          className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors relative ${
            selectedTransport === TransportType.BIKE_LANE
              ? "bg-emerald-100 border-emerald-500"
              : resources < getTransportCost(TransportType.BIKE_LANE, day)
                ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                : "hover:bg-slate-100 border-slate-200"
          }`}
          disabled={resources < getTransportCost(TransportType.BIKE_LANE, day)}
        >
          <Bike className="w-6 h-6 mb-1 text-emerald-600" />
          <span className="text-sm font-medium">Piste cyclable</span>
          <span className="text-xs text-slate-500">{getTransportCost(TransportType.BIKE_LANE, day)} €</span>

          {/* Tooltip */}
          {activeTooltip === TransportType.BIKE_LANE && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white border rounded-md shadow-lg text-xs z-10">
              {transportTooltips[TransportType.BIKE_LANE]}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          )}
        </button>

        <button
          onClick={() => selectTransport(TransportType.PEDESTRIAN_PATH)}
          onMouseEnter={() => setActiveTooltip(TransportType.PEDESTRIAN_PATH)}
          onMouseLeave={() => setActiveTooltip(null)}
          className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors relative ${
            selectedTransport === TransportType.PEDESTRIAN_PATH
              ? "bg-indigo-100 border-indigo-500"
              : resources < getTransportCost(TransportType.PEDESTRIAN_PATH, day)
                ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                : "hover:bg-slate-100 border-slate-200"
          }`}
          disabled={resources < getTransportCost(TransportType.PEDESTRIAN_PATH, day)}
        >
          <FootprintsIcon className="w-6 h-6 mb-1 text-indigo-600" />
          <span className="text-sm font-medium">Voie piétonne</span>
          <span className="text-xs text-slate-500">{getTransportCost(TransportType.PEDESTRIAN_PATH, day)} €</span>

          {/* Tooltip */}
          {activeTooltip === TransportType.PEDESTRIAN_PATH && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white border rounded-md shadow-lg text-xs z-10">
              {transportTooltips[TransportType.PEDESTRIAN_PATH]}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          )}
        </button>

        <button
          onClick={() => selectTransport(TransportType.SCOOTER_STATION)}
          onMouseEnter={() => setActiveTooltip(TransportType.SCOOTER_STATION)}
          onMouseLeave={() => setActiveTooltip(null)}
          className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors relative ${
            selectedTransport === TransportType.SCOOTER_STATION
              ? "bg-amber-100 border-amber-500"
              : resources < getTransportCost(TransportType.SCOOTER_STATION, day)
                ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                : "hover:bg-slate-100 border-slate-200"
          }`}
          disabled={resources < getTransportCost(TransportType.SCOOTER_STATION, day)}
        >
          <Train className="w-6 h-6 mb-1 text-amber-600" />
          <span className="text-sm font-medium">Tramway</span>
          <span className="text-xs text-slate-500">{getTransportCost(TransportType.SCOOTER_STATION, day)} €</span>

          {/* Tooltip */}
          {activeTooltip === TransportType.SCOOTER_STATION && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white border rounded-md shadow-lg text-xs z-10">
              {transportTooltips[TransportType.SCOOTER_STATION]}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          )}
        </button>

        <button
          onClick={() => selectTransport(TransportType.LIGHT_RAIL)}
          onMouseEnter={() => setActiveTooltip(TransportType.LIGHT_RAIL)}
          onMouseLeave={() => setActiveTooltip(null)}
          className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors relative ${
            selectedTransport === TransportType.LIGHT_RAIL
              ? "bg-red-100 border-red-500"
              : resources < getTransportCost(TransportType.LIGHT_RAIL, day)
                ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                : "hover:bg-slate-100 border-slate-200"
          }`}
          disabled={resources < getTransportCost(TransportType.LIGHT_RAIL, day)}
        >
          <Train className="w-6 h-6 mb-1 text-red-600" />
          <span className="text-sm font-medium">Métro</span>
          <span className="text-xs text-slate-500">{getTransportCost(TransportType.LIGHT_RAIL, day)} €</span>

          {/* Tooltip */}
          {activeTooltip === TransportType.LIGHT_RAIL && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white border rounded-md shadow-lg text-xs z-10">
              {transportTooltips[TransportType.LIGHT_RAIL]}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          )}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
        <div className="flex gap-2 items-start">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            Les coûts augmentent avec le temps. Planifiez votre réseau efficacement pour éviter de manquer de ressources
            !
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <p className="mb-2">Instructions:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Sélectionnez un type de transport</li>
          <li>Cliquez sur un point de départ</li>
          <li>Cliquez sur un point d'arrivée pour créer une connexion</li>
          <li>Surveillez la satisfaction des citoyens</li>
          <li>Complétez les défis pour gagner des bonus</li>
        </ol>
      </div>
    </div>
  )
}

