import { useState, useMemo } from 'react'
import charactersData from './data/characters.json'
import { getSuggestions, analyzeTeam, recommendPartnersForMain } from './utils/recommendationEngine'
import CollectionManager from './components/CollectionManager'
import CounterBuilder from './components/CounterBuilder'
import MetaBuilder from './components/MetaBuilder'

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
  const [activeTab, setActiveTab] = useState('builder')
  const [search, setSearch] = useState('')
  const [energyFilter, setEnergyFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [effectFilter, setEffectFilter] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState([])
  const [viewCharacter, setViewCharacter] = useState(null)

  // Save/Load State
  const [savedTeams, setSavedTeams] = useState(() => {
    const saved = localStorage.getItem('narutoArena_savedTeams')
    return saved ? JSON.parse(saved) : []
  })
  const [teamName, setTeamName] = useState('')

  // Collection/Ownership State
  const [ownedCharacters, setOwnedCharacters] = useState(() => {
    const saved = localStorage.getItem('narutoArena_ownedCharacters')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

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
    const effectMatchers = {
      stun: /stun|unable to use|disable|interrupt/i,
      heal: /heal|health|recover|restore/i,
      invulnerable: /invulnerable|ignore damage|immune|counter/i,
      aoe: /all enemies|all allies|all characters/i,
      energy: /energy|chakra|gain 1 random/i,
      affliction: /affliction|bleed|damage every|damage for \d+ turns/i,
      setup: /after \d+ turns?|for \d+ turns|during .* this skill/i
    }

    return charactersData.filter(char => {
      if (!char) return false

      const matchesSearch = (char.name || '').toLowerCase().includes(search.toLowerCase())

      const matchesEnergy = energyFilter === 'all' || (char.skills && char.skills.some(skill =>
        skill.energy && skill.energy.includes(energyFilter)
      ))

      const matchesClass = classFilter === 'all' || (char.skills && char.skills.some(skill =>
        skill.classes && skill.classes.toLowerCase().includes(classFilter.toLowerCase())
      ))

      const matchesEffect = effectFilter === 'all' || (char.skills && char.skills.some(skill =>
        effectMatchers[effectFilter]?.test(skill.description || '')
      ))

      return matchesSearch && matchesEnergy && matchesClass && matchesEffect
    })
  }, [search, energyFilter, classFilter, effectFilter])

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

  const teamEnergyMix = useMemo(() => {
    const total = Object.values(teamAnalysis).reduce((sum, value) => sum + value, 0)
    if (total === 0) return { dominant: null, spread: 0 }

    const sorted = Object.entries(teamAnalysis)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
    const [dominant, value] = sorted[0]
    return { dominant, spread: Math.round((value / total) * 100) }
  }, [teamAnalysis])

  // Suggestions Logic
  const suggestions = useMemo(() => {
    if (selectedTeam.length === 0) return []

    // Use owned filter if collection is set, otherwise show all
    const ownedIds = ownedCharacters.size > 0 ? ownedCharacters : null

    // When building around a single main (e.g. Lee, Ino(B) etc.)
    if (selectedTeam.length === 1) {
      return recommendPartnersForMain(selectedTeam[0], charactersData, ownedIds, 5)
    }

    // With 2+ members already chosen, fall back to full-team synergy
    return getSuggestions(charactersData, selectedTeam, 5, ownedIds)
  }, [selectedTeam, ownedCharacters])

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

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mb-4 relative z-10">
        <div className="flex gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700/60">
          <button onClick={() => setActiveTab('builder')} className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${activeTab === 'builder' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            🏗️ Team Builder
          </button>
          <button onClick={() => setActiveTab('collection')} className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${activeTab === 'collection' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            📚 My Collection
          </button>
          <button onClick={() => setActiveTab('counter')} className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${activeTab === 'counter' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            🎯 Counter Builder
          </button>
          <button onClick={() => setActiveTab('meta')} className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${activeTab === 'meta' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            📊 Meta Teams
          </button>
        </div>
      </div>

      {/* Team Builder Tab */}
      {activeTab === 'builder' && (
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/80 border border-orange-500/20 rounded-3xl p-6 shadow-xl shadow-orange-500/10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-orange-200/70">Deck Tray</p>
                  <h2 className="text-3xl font-black text-white">Clan Wars-style builder</h2>
                  <p className="text-sm text-slate-300 max-w-2xl">Arrange your three shinobi like a Clash Royale deck: see energy pressure, dominant color, and tempo at a glance before you dive into the card grid.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-black/40 border border-orange-500/30 rounded-2xl px-4 py-3 min-w-[140px] shadow-inner shadow-orange-500/20">
                    <div className="text-xs uppercase text-orange-200/80">Synergy</div>
                    <div className="text-3xl font-extrabold text-orange-100">{fullTeamAnalysis.synergyScore}%</div>
                    <div className="text-[10px] text-orange-200/70">Updated live</div>
                  </div>
                  <div className="bg-black/40 border border-blue-500/30 rounded-2xl px-4 py-3 min-w-[180px] shadow-inner shadow-blue-500/20">
                    <div className="text-xs uppercase text-blue-200/80">Energy focus</div>
                    <div className="flex items-center gap-2 text-sm text-white font-semibold">
                      <span className={`px-2 py-1 rounded-full border ${teamEnergyMix.dominant ? ENERGY_BG_COLORS[teamEnergyMix.dominant] : 'bg-gray-800 border-gray-700'}`}>
                        {teamEnergyMix.dominant ? teamEnergyMix.dominant.toUpperCase() : 'Balanced'}
                      </span>
                      <span className="text-blue-200 text-xs">{teamEnergyMix.spread}% of costs</span>
                    </div>
                    <div className="text-[10px] text-blue-200/70">{selectedTeam.length === 0 ? 'Add ninjas to see the mix' : 'Higher % means riskier economy'}</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr,280px] gap-4 items-stretch">
                <div className="bg-black/30 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap gap-3">
                  {[0, 1, 2].map((index) => {
                    const char = selectedTeam[index]
                    return (
                      <div
                        key={index}
                        className="flex-1 min-w-[220px] bg-slate-900/70 border border-slate-700 rounded-2xl overflow-hidden flex hover:border-orange-400/60 transition-all"
                      >
                        {char ? (
                          <>
                            <div className="relative">
                              <img
                                src={assetPath(`images/characters/${char.id}.png`)}
                                alt={char.name}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                                className="w-24 h-full object-cover"
                              />
                              <button
                                onClick={() => removeFromTeam(char.id)}
                                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                            <div className="p-3 flex flex-col justify-between flex-1">
                              <div>
                                <div className="text-xs uppercase text-orange-300/80">Slot {index + 1}</div>
                                <div className="font-bold text-lg text-white leading-tight">{char.name}</div>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {char.skills.slice(0, 3).map((skill, i) => (
                                    <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 capitalize">
                                      {(skill.classes || 'Skill').split(',')[0]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-1 mt-3">
                                {char.skills[0].energy.map((e, i) => (
                                  <span key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-gray-700/70 border-gray-700'}`}>
                                    {e === 'none' ? '-' : e[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center w-full h-24 text-slate-500 text-sm gap-2">
                            <span className="text-xl">＋</span>
                            <span>Select a shinobi</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="bg-black/30 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-slate-400">Tempo snapshot</p>
                      <p className="text-2xl font-bold text-white">{fullTeamAnalysis.tempo.pressureRating}% pressure</p>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <p>TTK: {fullTeamAnalysis.tempo.estimatedKillTurns ?? '—'}</p>
                      <p>Energy to Kill: {fullTeamAnalysis.tempo.costToKill ?? '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400">Burst</p>
                      <p className="text-white text-lg font-semibold">{fullTeamAnalysis.tempo.burstDamage || 0} dmg</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400">Energy</p>
                      <p className="text-white text-lg font-semibold">{Object.values(teamAnalysis).reduce((a, b) => a + b, 0)} total</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    {Object.entries(teamAnalysis).map(([type, count]) => (
                      count > 0 && (
                        <span key={type} className={`px-2 py-1 rounded-full border ${ENERGY_BG_COLORS[type] || 'bg-gray-700'}`}>
                          {type.toUpperCase()} · {count}
                        </span>
                      )
                    ))}
                    {Object.values(teamAnalysis).every(v => v === 0) && (
                      <span className="text-slate-500">Add characters to see energy mix</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
            {/* LEFT COLUMN: Team & Analysis */}
            <div className="space-y-6">
              {/* Selected Team and save/load */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-orange-500/10 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-orange-300">Deck slots</h2>
                    <p className="text-xs text-slate-400">Tap a card to open quick view.</p>
                  </div>
                  <span className="text-sm bg-gray-700 px-2 py-1 rounded text-white">{selectedTeam.length}/3</span>
                </div>
                <div className="space-y-3">
                  {[0, 1, 2].map(index => {
                    const char = selectedTeam[index]
                    return (
                      <div key={index} className="h-24 bg-gray-700/40 rounded-lg border-2 border-dashed border-gray-700 relative flex items-center justify-between overflow-hidden px-3">
                        {char ? (
                          <div className="flex items-center gap-3 w-full">
                            <img
                              src={assetPath(`images/characters/${char.id}.png`)}
                              alt={char.name}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                              className="h-20 w-20 object-cover rounded-lg border border-slate-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate text-white">{char.name}</div>
                              <div className="text-[11px] text-slate-400 truncate">{char.skills.map(s => s.name).slice(0, 2).join(' • ')}</div>
                              <div className="flex gap-1 mt-2">
                                {char.skills[0].energy.map((e, i) => (
                                  <span key={i} className={`w-6 h-6 rounded border text-[10px] font-bold flex items-center justify-center ${ENERGY_BG_COLORS[e] || 'bg-gray-700'}`}>
                                    {e === 'none' ? '-' : e[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => setViewCharacter(char)}
                                className="text-xs text-blue-300 hover:text-blue-200"
                              >
                                Open card
                              </button>
                              <button
                                onClick={() => removeFromTeam(char.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">Empty Slot</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Save Team Controls */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-2">
                    <input
                      type="text"
                      placeholder="Name this deck"
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                    <button
                      onClick={saveTeam}
                      disabled={selectedTeam.length === 0 || !teamName.trim()}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm py-2 rounded transition-colors font-bold"
                    >
                      Save Deck
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggested Characters */}
              {selectedTeam.length > 0 && selectedTeam.length < 3 && (
                <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-amber-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                      <span className="text-yellow-500">★</span> Suggested teammates
                    </h3>
                    <span className="text-[11px] text-slate-400">Tap to preview like deckshop cards</span>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map(char => (
                      <div key={char.id} className="bg-gray-900/50 p-2 rounded border border-gray-700 flex justify-between items-center group cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setViewCharacter(char)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-[10px] text-gray-500 overflow-hidden border border-gray-700">
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
                    Saved decks
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
                      <h3 className="font-bold text-slate-200">Energy footprint</h3>
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
            <div className="space-y-6">

              {/* Filters */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-4 shadow-lg shadow-orange-500/10">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[220px]">
                    <input
                      type="text"
                      placeholder="Search shinobi..."
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-slate-400">{filteredCharacters.length} cards shown</div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Energy</p>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'green', 'red', 'blue', 'white'].map(type => (
                      <button
                        key={type}
                        onClick={() => setEnergyFilter(type)}
                        className={`px-3 py-2 rounded-full text-sm border transition-colors ${energyFilter === type ? 'bg-orange-600 text-white border-orange-400' : 'bg-gray-900 border-gray-700 text-slate-200 hover:border-orange-400/60'}`}
                      >
                        {type === 'all' ? 'All energy' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Class focus</p>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'physical', 'energy', 'strategic', 'mental', 'affliction', 'instant', 'action', 'control'].map(option => (
                      <button
                        key={option}
                        onClick={() => setClassFilter(option)}
                        className={`px-3 py-2 rounded-full text-sm border transition-colors ${classFilter === option ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-900 border-gray-700 text-slate-200 hover:border-blue-400/60'}`}
                      >
                        {option === 'all' ? 'All classes' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Card effect</p>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'stun', 'heal', 'invulnerable', 'aoe', 'energy', 'affliction', 'setup'].map(effect => (
                      <button
                        key={effect}
                        onClick={() => setEffectFilter(effect)}
                        className={`px-3 py-2 rounded-full text-sm border transition-colors ${effectFilter === effect ? 'bg-purple-600 text-white border-purple-400' : 'bg-gray-900 border-gray-700 text-slate-200 hover:border-purple-400/60'}`}
                      >
                        {effect === 'all' ? 'All effects' : effect.charAt(0).toUpperCase() + effect.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Character Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCharacters.slice(0, 60).map(char => (
                  <div
                    key={char.id}
                    className="bg-slate-900/80 rounded-2xl border border-slate-800/80 hover:border-orange-400/80 transition-all hover:shadow-orange-500/25 hover:shadow-xl overflow-hidden group cursor-pointer flex flex-col"
                    onClick={() => setViewCharacter(char)}
                  >
                    <div className="flex h-28">
                      <img
                        src={assetPath(`images/characters/${char.id}.png`)}
                        alt={char.name}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                        className="w-28 h-28 object-cover bg-gray-900"
                      />
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-orange-300/80">Card #{char.id}</div>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-orange-400 transition-colors">{char.name}</h3>
                        </div>
                        <div className="flex gap-1 flex-wrap text-[11px] text-slate-300">
                          {char.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 capitalize">{(skill.classes || '').split(',')[0] || 'Skill'}</span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {char.skills[0].energy.map((e, i) => (
                            <span key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-gray-700/70 border-gray-700'}`}>
                              {e === 'none' ? '-' : e[0].toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Skill Preview (Mini) */}
                    <div className="bg-gray-900/50 p-3 space-y-2">
                      {char.skills && char.skills.slice(0, 2).map((skill, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="flex gap-1 mt-1">
                            {skill.energy.map((e, i) => (
                              <span key={i} className={`w-5 h-5 rounded border text-[9px] font-bold flex items-center justify-center ${ENERGY_BG_COLORS[e] || 'bg-gray-700/70 border-gray-700'}`}>
                                {e === 'none' ? '-' : e[0].toUpperCase()}
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-white font-semibold leading-tight">{skill.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{skill.description}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addToTeam(char)
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                          Add to Team
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCharacters.length === 0 && (
                <div className="text-center text-gray-500 py-12">No characters found matching your filters.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Tab */}
      {activeTab === 'collection' && (
        <div className="max-w-7xl mx-auto relative z-10">
          <CollectionManager allCharacters={charactersData} />
        </div>
      )}

      {/* Counter Builder Tab */}
      {activeTab === 'counter' && (
        <div className="max-w-7xl mx-auto relative z-10">
          <CounterBuilder allCharacters={charactersData} />
        </div>
      )}

      {/* Meta Teams Tab */}
      {activeTab === 'meta' && (
        <div className="max-w-7xl mx-auto relative z-10">
          <MetaBuilder allCharacters={charactersData} />
        </div>
      )}

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
