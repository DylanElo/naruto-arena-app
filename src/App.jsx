import { useState, useMemo } from 'react'
import charactersData from './data/characters.json'
import { getSuggestions, analyzeTeam } from './utils/recommendationEngine'

// Energy Colors Mapping
const ENERGY_COLORS = {
  green: 'text-green-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  white: 'text-white',
  black: 'text-gray-400', // Random/Specific
  none: 'text-gray-500'
}

const ENERGY_BG_COLORS = {
  green: 'bg-green-900/50 border-green-500/50',
  red: 'bg-red-900/50 border-red-500/50',
  blue: 'bg-blue-900/50 border-blue-500/50',
  white: 'bg-gray-100/20 border-white/50',
  black: 'bg-gray-800 border-gray-600',
  none: 'bg-gray-800 border-gray-700'
}

const assetPath = (relativePath) => {
  const trimmedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return `${import.meta.env.BASE_URL}${trimmedPath}`
}

function App() {
  const [search, setSearch] = useState('')
  const [energyFilter, setEnergyFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState([])
  const [viewCharacter, setViewCharacter] = useState(null)

  // Save/Load State
  const [savedTeams, setSavedTeams] = useState(() => {
    const saved = localStorage.getItem('narutoArena_savedTeams')
    return saved ? JSON.parse(saved) : []
  })
  const [teamName, setTeamName] = useState('')

  // Persist Saved Teams
  useMemo(() => {
    localStorage.setItem('narutoArena_savedTeams', JSON.stringify(savedTeams))
  }, [savedTeams])

  // Save/Load Handlers
  const saveTeam = () => {
    if (selectedTeam.length > 0 && teamName.trim()) {
      setSavedTeams([...savedTeams, { name: teamName, members: selectedTeam }])
      setTeamName('')
    }
  }

  const loadTeam = (team) => {
    setSelectedTeam(team.members)
  }

  const deleteTeam = (index) => {
    const newTeams = [...savedTeams]
    newTeams.splice(index, 1)
    setSavedTeams(newTeams)
  }

  // Filter Logic
  const filteredCharacters = useMemo(() => {
    return charactersData.filter(char => {
      if (!char) return false

      const matchesSearch = (char.name || '').toLowerCase().includes(search.toLowerCase())

      const matchesEnergy = energyFilter === 'all' || (char.skills && char.skills.some(skill =>
        skill.energy && skill.energy.includes(energyFilter)
      ))

      const matchesClass = classFilter === 'all' || (char.skills && char.skills.some(skill =>
        skill.classes && skill.classes.toLowerCase().includes(classFilter.toLowerCase())
      ))

      return matchesSearch && matchesEnergy && matchesClass
    })
  }, [search, energyFilter, classFilter])

  // Team Management
  const addToTeam = (char) => {
    if (selectedTeam.length < 3 && !selectedTeam.find(c => c.id === char.id)) {
      setSelectedTeam([...selectedTeam, char])
    }
  }

  const removeFromTeam = (charId) => {
    setSelectedTeam(selectedTeam.filter(c => c.id !== charId))
  }

  // Team Analysis
  const teamAnalysis = useMemo(() => {
    const energyCounts = { green: 0, red: 0, blue: 0, white: 0, black: 0 }
    selectedTeam.forEach(char => {
      char.skills.forEach(skill => {
        skill.energy.forEach(e => {
          if (energyCounts[e] !== undefined) energyCounts[e]++
        })
      })
    })
    return energyCounts
  }, [selectedTeam])

  // Suggestions Logic
  const suggestions = useMemo(() => {
    return getSuggestions(charactersData, selectedTeam)
  }, [selectedTeam])

  // Full Team Analysis (strengths, weaknesses, strategies)
  const fullTeamAnalysis = useMemo(() => {
    return analyzeTeam(selectedTeam)
  }, [selectedTeam])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-4 md:p-10 font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-10 top-10 w-72 h-72 bg-orange-500/30 blur-3xl rounded-full"></div>
        <div className="absolute right-0 bottom-10 w-80 h-80 bg-blue-500/20 blur-3xl rounded-full"></div>
      </div>

      <header className="mb-10 text-center relative z-10">
        <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-3">Naruto Arena Companion</p>
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-yellow-400 drop-shadow-lg">
          Team Builder & Analyzer
        </h1>
        <p className="text-gray-300 mt-3 max-w-3xl mx-auto text-sm md:text-base">
          Draft smarter squads with skill-driven synergy insights, turn-to-kill projections, and energy costs to secure the finish.
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">

        {/* LEFT COLUMN: Team & Analysis */}
        <div className="lg:col-span-1 space-y-6">
          {/* Selected Team */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-orange-500/10 backdrop-blur">
            <h2 className="text-xl font-bold mb-4 text-orange-300 flex justify-between items-center">
              Your Team
              <span className="text-sm bg-gray-700 px-2 py-1 rounded text-white">{selectedTeam.length}/3</span>
            </h2>
            <div className="space-y-3">
              {[0, 1, 2].map(index => {
                const char = selectedTeam[index]
                return (
                  <div key={index} className="h-24 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 relative flex items-center justify-center overflow-hidden">
                    {char ? (
                      <div className="w-full h-full flex items-center bg-gray-800 border-2 border-blue-500 rounded-lg relative group">
                        <img
                          src={assetPath(`images/characters/${char.id}.png`)}
                          alt={char.name}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                          className="h-full w-24 object-cover"
                        />
                        <div className="p-2 flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{char.name}</div>
                          <button
                            onClick={() => removeFromTeam(char.id)}
                            className="text-xs text-red-400 hover:text-red-300 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Empty Slot</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Save Team Controls */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <input
                type="text"
                placeholder="Team Name"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2 focus:border-orange-500 outline-none"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <button
                onClick={saveTeam}
                disabled={selectedTeam.length === 0 || !teamName.trim()}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm py-2 rounded transition-colors font-bold"
              >
                Save Team
              </button>
            </div>
          </div>

          {/* Suggested Characters */}
          {selectedTeam.length > 0 && selectedTeam.length < 3 && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-amber-500/10">
              <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-yellow-500">★</span> Suggested Teammates
              </h3>
              <div className="space-y-2">
                {suggestions.map(char => (
                  <div key={char.id} className="bg-gray-900/50 p-2 rounded border border-gray-700 flex justify-between items-center group cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setViewCharacter(char)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-[10px] text-gray-500 overflow-hidden">
                        <img
                          src={assetPath(`images/characters/${char.id}.png`)}
                          alt={char.name}
                          onError={(e) => { e.target.style.display = 'none' }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-200 truncate">{char.name}</div>
                        <div className="text-[10px] text-green-400">Synergy Score: {char.synergyScore}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToTeam(char)
                      }}
                      className="text-blue-400 hover:text-blue-300 text-lg px-2"
                      title="Add to Team"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Teams List */}
          {savedTeams.length > 0 && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-blue-500/10 max-h-60 overflow-y-auto">
              <h3 className="font-bold text-gray-300 mb-3 flex justify-between items-center">
                Saved Teams
                <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">{savedTeams.length}</span>
              </h3>
              <div className="space-y-2">
                {savedTeams.map((team, idx) => (
                  <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-700 flex justify-between items-center group">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-bold text-sm text-orange-400 truncate">{team.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {team.members.map(m => m.name).join(', ')}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => loadTeam(team)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded"
                        title="Load Team"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteTeam(idx)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded"
                        title="Delete Team"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Analysis */}
          {selectedTeam.length > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-blue-500/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-200">Energy Footprint</h3>
                  <span className="text-xs uppercase tracking-widest text-slate-500">skill costs</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(teamAnalysis).map(([type, count]) => (
                    count > 0 && (
                      <div key={type} className={`flex justify-between items-center px-3 py-2 rounded-lg ${ENERGY_BG_COLORS[type] || 'bg-gray-700'}`}>
                        <span className="capitalize text-sm">{type}</span>
                        <span className="font-bold text-white/90">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-amber-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Synergy</p>
                    <p className="text-3xl font-extrabold text-orange-300">{fullTeamAnalysis.synergyScore}%</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Turn to Kill</p>
                      <p className="text-lg font-semibold text-white">{fullTeamAnalysis.tempo.estimatedKillTurns ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Energy to Kill</p>
                      <p className="text-lg font-semibold text-white">{fullTeamAnalysis.tempo.costToKill ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Burst Damage</p>
                      <p className="text-lg font-semibold text-white">{fullTeamAnalysis.tempo.burstDamage || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Pressure</p>
                      <p className="text-lg font-semibold text-white">{fullTeamAnalysis.tempo.pressureRating}%</p>
                    </div>
                  </div>
                </div>

                {fullTeamAnalysis.synergyHighlights.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                    <p className="text-xs uppercase tracking-widest text-orange-200 mb-2">Synergy Reads</p>
                    <ul className="space-y-2 text-sm text-slate-100">
                      {fullTeamAnalysis.synergyHighlights.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-orange-300">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Team Analysis - Strengths, Weaknesses, Strategies */}
          {selectedTeam.length === 3 && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-blue-500/10">
              <h3 className="font-bold text-blue-200 mb-3 text-lg flex items-center gap-2">📊 Deep Dive</h3>

              {/* Strengths */}
              {fullTeamAnalysis.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-green-300 mb-2 flex items-center gap-2">
                    <span>✓</span> Strengths
                  </h4>
                  <ul className="space-y-1">
                    {fullTeamAnalysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-200 pl-4">• {strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {fullTeamAnalysis.weaknesses.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                    <span>⚠</span> Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {fullTeamAnalysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-gray-200 pl-4">• {weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strategies */}
              {fullTeamAnalysis.strategies.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                    <span>🎯</span> How to Play
                  </h4>
                  <ul className="space-y-1">
                    {fullTeamAnalysis.strategies.map((strategy, idx) => (
                      <li key={idx} className="text-sm text-gray-200 pl-4">• {strategy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Character Selection */}
        <div className="lg:col-span-3 space-y-6">

          {/* Filters */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 flex flex-wrap gap-4 items-center shadow-lg shadow-orange-500/10">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search characters..."
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-orange-500 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-orange-500 outline-none"
              value={energyFilter}
              onChange={(e) => setEnergyFilter(e.target.value)}
            >
              <option value="all">All Energy</option>
              <option value="green">Green (Taijutsu)</option>
              <option value="red">Red (Ninjutsu)</option>
              <option value="blue">Blue (Chakra)</option>
              <option value="white">White (Genjutsu)</option>
            </select>

            <select
              className="bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-orange-500 outline-none"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              <option value="physical">Physical</option>
              <option value="energy">Energy</option>
              <option value="strategic">Strategic</option>
              <option value="mental">Mental</option>
              <option value="affliction">Affliction</option>
              <option value="instant">Instant</option>
              <option value="action">Action</option>
              <option value="control">Control</option>
            </select>
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCharacters.slice(0, 60).map(char => (
              <div
                key={char.id}
                className="bg-slate-900/80 rounded-2xl border border-slate-800/80 hover:border-orange-400/80 transition-all hover:shadow-orange-500/25 hover:shadow-xl overflow-hidden group cursor-pointer flex flex-col"
                onClick={() => setViewCharacter(char)}
              >
                <div className="flex h-24">
                  <img
                    src={assetPath(`images/characters/${char.id}.png`)}
                    alt={char.name}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                    className="w-24 h-24 object-cover bg-gray-900"
                  />
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-orange-400 transition-colors">{char.name}</h3>
                      <div className="text-xs text-gray-500 mt-1">ID: {char.id}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToTeam(char)
                      }}
                      className="self-end bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition-colors"
                    >
                      Add to Team
                    </button>
                  </div>
                </div>

                {/* Skill Preview (Mini) */}
                <div className="bg-gray-900/50 p-2 flex gap-1 overflow-x-auto scrollbar-hide">
                  {char.skills && char.skills.map((skill, idx) => (
                    <div key={idx} className="flex-shrink-0 w-6 h-6 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px]" title={skill.name}>
                      {skill.energy && skill.energy[0] ? skill.energy[0][0].toUpperCase() : '?'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredCharacters.length === 0 && (
            <div className="text-center text-gray-500 py-12">No characters found matching your filters.</div>
          )}
        </div>
      </div>

      {/* Character Detail Modal */}
      {viewCharacter && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setViewCharacter(null)}>
          <div className="bg-gray-800 w-full max-w-2xl rounded-xl border border-gray-600 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="p-6 bg-gray-900 border-b border-gray-700 flex gap-6">
              <img
                src={assetPath(`images/characters/${viewCharacter.id}.png`)}
                alt={viewCharacter.name}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                className="w-32 h-32 object-cover rounded-lg border-2 border-orange-500 shadow-lg"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-bold text-white">{viewCharacter.name}</h2>
                  <button onClick={() => setViewCharacter(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <p className="text-gray-400 mt-2 text-sm leading-relaxed">{viewCharacter.description}</p>
                <button
                  onClick={() => {
                    addToTeam(viewCharacter)
                    setViewCharacter(null)
                  }}
                  className="mt-4 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded font-bold transition-colors"
                >
                  Add to Team
                </button>
              </div>
            </div>

            {/* Skills List */}
            <div className="p-6 overflow-y-auto space-y-4 bg-gray-800">
              <h3 className="text-xl font-bold text-gray-300 mb-2">Skills</h3>
              {viewCharacter.skills.map((skill, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-blue-300">{skill.name}</h4>
                      <div className="text-xs text-gray-500">{skill.classes}</div>
                    </div>
                    <div className="flex gap-2">
                      {/* Energy Cost */}
                      <div className="flex gap-1">
                        {skill.energy.map((e, i) => (
                          <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold capitalize border ${ENERGY_BG_COLORS[e] || 'bg-gray-700'}`}>
                            {e === 'none' ? '-' : e[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                      {/* Cooldown */}
                      <div className="w-6 h-6 rounded bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400" title="Cooldown">
                        {skill.cooldown === 'None' ? '0' : skill.cooldown}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">{skill.description}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default App
