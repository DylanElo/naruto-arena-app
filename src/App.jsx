import { useState, useMemo } from 'react'
import charactersData from './data/characters.json'
import { getSuggestions, analyzeTeam, recommendPartnersForMain } from './utils/recommendationEngine'
import CollectionManager from './components/CollectionManager'
import CounterBuilder from './components/CounterBuilder'
import MetaBuilder from './components/MetaBuilder'

// Energy Colors Mapping
const ENERGY_COLORS = {
  green: 'text-emerald-600',
  red: 'text-rose-600',
  blue: 'text-sky-600',
  white: 'text-slate-700',
  black: 'text-slate-500', // Random/Specific
  none: 'text-slate-400'
}

const ENERGY_BG_COLORS = {
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  red: 'bg-rose-50 border-rose-200 text-rose-700',
  blue: 'bg-sky-50 border-sky-200 text-sky-700',
  white: 'bg-slate-100 border-slate-200 text-slate-700',
  black: 'bg-slate-200 border-slate-300 text-slate-700',
  none: 'bg-slate-100 border-slate-200 text-slate-600'
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
  const [ownedOnly, setOwnedOnly] = useState(false)
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

  // Ownership Handlers
  const handleToggleCharacter = (id) => {
    const newSet = new Set(ownedCharacters)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setOwnedCharacters(newSet)
    localStorage.setItem('narutoArena_ownedCharacters', JSON.stringify(Array.from(newSet)))
  }

  const handleBatchUpdateCollection = (ids) => {
    const newSet = new Set(ids)
    setOwnedCharacters(newSet)
    localStorage.setItem('narutoArena_ownedCharacters', JSON.stringify(Array.from(newSet)))
  }

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

  const randomizeTeam = () => {
    const pool = ownedOnly && ownedCharacters.size > 0
      ? charactersData.filter((char) => ownedCharacters.has(char.id))
      : charactersData
    const randomThree = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    setSelectedTeam(randomThree)
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

      if (ownedOnly && !ownedCharacters.has(char.id)) return false

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
  }, [search, energyFilter, classFilter, effectFilter, ownedOnly, ownedCharacters])

  const activeFilters = useMemo(() => {
    const chips = []
    if (search.trim()) chips.push({ label: `Search: "${search.trim()}"`, onClear: () => setSearch('') })
    if (energyFilter !== 'all') chips.push({ label: `Energy · ${energyFilter}`, onClear: () => setEnergyFilter('all') })
    if (classFilter !== 'all') chips.push({ label: `Class · ${classFilter}`, onClear: () => setClassFilter('all') })
    if (effectFilter !== 'all') chips.push({ label: `Effect · ${effectFilter}`, onClear: () => setEffectFilter('all') })
    if (ownedOnly) chips.push({ label: 'Owned only', onClear: () => setOwnedOnly(false) })
    return chips
  }, [search, energyFilter, classFilter, effectFilter, ownedOnly])

  const clearFilters = () => {
    setSearch('')
    setEnergyFilter('all')
    setClassFilter('all')
    setEffectFilter('all')
    setOwnedOnly(false)
  }

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

    const ownedIds = ownedCharacters.size > 0 ? ownedCharacters : null

    if (selectedTeam.length === 1) {
      return recommendPartnersForMain(selectedTeam[0], charactersData, ownedIds, 5)
    }

    return getSuggestions(charactersData, selectedTeam, 5, ownedIds)
  }, [selectedTeam, ownedCharacters])

  // Full Team Analysis (strengths, weaknesses, strategies)
  const fullTeamAnalysis = useMemo(() => {
    return analyzeTeam(selectedTeam)
  }, [selectedTeam])

  const ownedProgress = Math.round((ownedCharacters.size / charactersData.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf7ff] via-[#eef7ff] to-[#f9fff2] text-slate-900 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen">
        <div className="absolute -left-24 top-10 w-72 h-72 bg-[#c1ecff] blur-3xl rounded-full"></div>
        <div className="absolute right-4 -bottom-10 w-96 h-96 bg-[#ffd1e8] blur-3xl rounded-full"></div>
        <div className="absolute inset-x-10 bottom-0 h-52 bg-gradient-to-t from-white/60 via-transparent"></div>
      </div>

      <header className="relative z-10 px-4 md:px-10 pt-8 pb-6 border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(255,182,193,0.25)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white shadow-lg shadow-sky-200 border border-white/70">
                <span className="text-xs tracking-[0.35em] text-sky-500 uppercase">Naruto Arena</span>
                <span className="text-[11px] text-slate-600">Squad Architect</span>
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-purple-600 to-pink-500 drop-shadow-lg">
                Sunlit playground for shinobi theorycrafting
              </h1>
              <p className="text-slate-600 mt-4 max-w-3xl text-sm md:text-base leading-relaxed">
                A brighter, airy cockpit for the Naruto-Arena meta. Draft, analyze, and archive squads with crisp cards, soft gradients, and live momentum readouts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-white border border-orange-100 rounded-2xl px-4 py-3 min-w-[160px] shadow-lg shadow-orange-200/60">
                <div className="text-xs uppercase text-orange-600">Synergy health</div>
                <div className="text-3xl font-extrabold text-orange-500">{fullTeamAnalysis.synergyScore}%</div>
                <div className="text-[10px] text-orange-500/70">Live across slots</div>
              </div>
              <div className="bg-white border border-sky-100 rounded-2xl px-4 py-3 min-w-[160px] shadow-lg shadow-sky-200/60">
                <div className="text-xs uppercase text-sky-600">Energy focus</div>
                <div className="flex items-center gap-2 text-sm text-slate-900 font-semibold">
                  <span className={`px-2 py-1 rounded-full border ${teamEnergyMix.dominant ? ENERGY_BG_COLORS[teamEnergyMix.dominant] : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {teamEnergyMix.dominant ? teamEnergyMix.dominant.toUpperCase() : 'Balanced'}
                  </span>
                  <span className="text-sky-600 text-xs">{teamEnergyMix.spread}% concentration</span>
                </div>
                <div className="text-[10px] text-slate-500">{selectedTeam.length === 0 ? 'Add ninjas to see the mix' : 'Higher % means riskier economy'}</div>
              </div>
              <div className="bg-white border border-emerald-100 rounded-2xl px-4 py-3 min-w-[160px] shadow-lg shadow-emerald-200/60">
                <div className="text-xs uppercase text-emerald-600">Collection</div>
                <div className="text-3xl font-extrabold text-emerald-500">{ownedProgress}%</div>
                <div className="text-[10px] text-emerald-600/70">{ownedCharacters.size} owned / {charactersData.length}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-white/70 backdrop-blur">
            <button onClick={() => setActiveTab('builder')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'builder' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/80' : 'text-slate-600 hover:bg-slate-100'}`}>
              🛠️ Builder
            </button>
            <button onClick={() => setActiveTab('collection')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'collection' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/80' : 'text-slate-600 hover:bg-slate-100'}`}>
              📚 Collection
            </button>
            <button onClick={() => setActiveTab('counter')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'counter' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/80' : 'text-slate-600 hover:bg-slate-100'}`}>
              🎯 Counter Lab
            </button>
            <button onClick={() => setActiveTab('meta')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'meta' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/80' : 'text-slate-600 hover:bg-slate-100'}`}>
              🛰️ Meta Decks
            </button>
          </div>
        </div>
      </header>

      {/* Team Builder Tab */}
      {activeTab === 'builder' && (
        <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <div className="space-y-6">
              <div className="bg-white/80 border border-white/70 rounded-3xl p-6 shadow-2xl shadow-sky-200/80 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Deck tray</p>
                    <h2 className="text-3xl font-black text-slate-900">Glass slots with quick gestures</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">Tap a card to peek at the full profile, press + to instantly reserve it, or use the randomizer to test weird synergies.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={randomizeTeam} className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl font-semibold text-white shadow-lg shadow-sky-200/60">Shuffle trio</button>
                    <button onClick={() => setSelectedTeam([])} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-500">Clear board</button>
                    <button onClick={saveTeam} disabled={selectedTeam.length === 0 || !teamName.trim()} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl font-semibold text-white">Save deck</button>
                  </div>
                </div>

                <div className="grid md:grid-cols-[1fr,280px] gap-4 items-stretch">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap gap-3 shadow-inner shadow-slate-200/80">
                    {[0, 1, 2].map((index) => {
                      const char = selectedTeam[index]
                      return (
                        <div
                          key={index}
                          className="flex-1 min-w-[220px] bg-white border border-slate-200 rounded-2xl overflow-hidden flex hover:border-sky-400/60 transition-all"
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
                                  className="absolute top-2 right-2 bg-white/90 text-slate-700 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-rose-500 hover:text-white transition-colors"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="p-3 flex flex-col justify-between flex-1">
                                <div>
                                  <div className="text-xs uppercase text-sky-500">Slot {index + 1}</div>
                                  <div className="font-bold text-lg text-slate-900 leading-tight">{char.name}</div>
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {char.skills.slice(0, 3).map((skill, i) => (
                                      <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 capitalize">
                                        {(skill.classes || 'Skill').split(',')[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1 mt-3">
                                  {char.skills[0].energy.map((e, i) => (
                                    <span key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                      {e === 'none' ? '-' : e[0].toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full h-24 text-slate-400 text-sm gap-2">
                              <span className="text-xl">＋</span>
                              <span>Select a shinobi</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 shadow-inner shadow-slate-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase text-sky-500">Tempo snapshot</p>
                        <p className="text-2xl font-bold text-slate-900">{fullTeamAnalysis.tempo.pressureRating}% pressure</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>TTK: {fullTeamAnalysis.tempo.estimatedKillTurns ?? '—'}</p>
                        <p>Energy to Kill: {fullTeamAnalysis.tempo.costToKill ?? '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-slate-500">Burst</p>
                        <p className="text-slate-900 text-lg font-semibold">{fullTeamAnalysis.tempo.burstDamage || 0} dmg</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-slate-500">Energy</p>
                        <p className="text-slate-900 text-lg font-semibold">{Object.values(teamAnalysis).reduce((a, b) => a + b, 0)} total</p>
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

                <div className="mt-6 grid grid-cols-1 md:grid-cols-[1.1fr,0.9fr] gap-4">
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
                                  <button onClick={() => setViewCharacter(char)} className="text-xs text-blue-300 hover:text-blue-200">Open card</button>
                                  <button onClick={() => removeFromTeam(char.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">Empty Slot</div>
                            )}
                          </div>
                        )
                      })}
                    </div>

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

                  <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-blue-500/10 flex flex-col gap-4">
                    <div>
                      <h3 className="font-bold text-gray-200 flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">★</span> Suggested teammates
                      </h3>
                      <p className="text-[11px] text-slate-400">Tap to preview full card, or quick add.</p>
                    </div>
                    <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
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
                      {suggestions.length === 0 && (
                        <div className="text-sm text-slate-500">Add at least one hero to start seeing synergies.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
                <div className="space-y-6">
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
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-4 shadow-lg shadow-emerald-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-200 flex items-center gap-2">Mission log</h3>
                        <p className="text-xs text-slate-400">Auto-notes from the analyzer</p>
                      </div>
                      <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Live</span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-200">
                      {(fullTeamAnalysis.strengths || []).slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="text-emerald-400">●</span>
                          <p className="leading-snug">{s}</p>
                        </div>
                      ))}
                      {(fullTeamAnalysis.weaknesses || []).slice(0, 2).map((w, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-red-200">
                          <span>●</span>
                          <p className="leading-snug">{w}</p>
                        </div>
                      ))}
                      {(fullTeamAnalysis.strategies || []).slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-blue-200">
                          <span>●</span>
                          <p className="leading-snug">{s}</p>
                        </div>
                      ))}
                      {selectedTeam.length === 0 && (
                        <p className="text-slate-500 text-sm">Pick anyone to start receiving analysis notes.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-5 shadow-lg shadow-amber-500/10">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">Control palette</h3>
                        <p className="text-sm text-slate-300">Layered filters and toggles to curate your roster preview.</p>
                      </div>
                      <button onClick={clearFilters} className="text-[11px] uppercase tracking-[0.2em] text-amber-200 hover:text-amber-100">Reset all</button>
                    </div>

                    <div className="bg-black/30 rounded-xl p-3 border border-slate-800">
                      <div className="flex flex-col md:flex-row gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Search ninjas, clan names, or tags"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-300"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-200 bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-2">
                          <input type="checkbox" checked={ownedOnly} onChange={() => setOwnedOnly(!ownedOnly)} className="accent-orange-400" />
                          Owned only
                        </label>
                      </div>
                      {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeFilters.map((chip, idx) => (
                            <span key={idx} className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-200 px-3 py-1 rounded-full border border-amber-300/30 text-xs">
                              {chip.label}
                              <button onClick={chip.onClear} className="text-amber-100/80 hover:text-white">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Energy</p>
                        <p className="text-[11px] text-slate-500">Prioritize your opening hand</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'green', 'red', 'blue', 'white'].map(type => (
                          <button
                            key={type}
                            onClick={() => setEnergyFilter(type)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${energyFilter === type ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-200 shadow-amber-300/40' : 'bg-slate-950/60 border-white/10 text-slate-100 hover:border-amber-300/60'}`}
                          >
                            {type === 'all' ? 'All energy' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Class focus</p>
                        <p className="text-[11px] text-slate-500">Balance control vs burst</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'physical', 'energy', 'strategic', 'mental', 'affliction', 'instant', 'action', 'control'].map(option => (
                          <button
                            key={option}
                            onClick={() => setClassFilter(option)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${classFilter === option ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 border-sky-200 shadow-sky-300/40' : 'bg-slate-950/60 border-white/10 text-slate-100 hover:border-sky-300/60'}`}
                          >
                            {option === 'all' ? 'All classes' : option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Card effect</p>
                        <p className="text-[11px] text-slate-500">Find the tools you need</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'stun', 'heal', 'invulnerable', 'aoe', 'energy', 'affliction', 'setup'].map(effect => (
                          <button
                            key={effect}
                            onClick={() => setEffectFilter(effect)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${effectFilter === effect ? 'bg-gradient-to-r from-fuchsia-400 to-purple-700 text-slate-950 border-fuchsia-200 shadow-fuchsia-300/40' : 'bg-slate-950/60 border-white/10 text-slate-100 hover:border-fuchsia-300/60'}`}
                          >
                            {effect === 'all' ? 'All effects' : effect.charAt(0).toUpperCase() + effect.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl border border-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Character library</h3>
                        <p className="text-xs text-slate-400">Top 60 results shown live.</p>
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded-full border border-white/20 text-white/80">{filteredCharacters.length} matches</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCharacters.slice(0, 60).map(char => (
                        <div
                          key={char.id}
                          className="bg-slate-900/70 rounded-2xl border border-white/10 hover:border-amber-300/70 transition-all hover:shadow-xl hover:shadow-amber-500/20 overflow-hidden group cursor-pointer flex flex-col backdrop-blur"
                          onClick={() => setViewCharacter(char)}
                        >
                          <div className="flex h-28">
                            <img
                              src={assetPath(`images/characters/${char.id}.png`)}
                              alt={char.name}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                              className="w-28 h-28 object-cover bg-slate-950/70"
                            />
                            <div className="p-3 flex-1 flex flex-col gap-2">
                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-orange-300/80">Card #{char.id}</div>
                                <h3 className="font-bold text-lg leading-tight group-hover:text-amber-300 transition-colors">{char.name}</h3>
                              </div>
                              <div className="flex gap-1 flex-wrap text-[11px] text-slate-300">
                                {char.skills.slice(0, 3).map((skill, idx) => (
                                  <span key={idx} className="px-2 py-1 rounded-full bg-slate-950/60 border border-white/10 capitalize">{(skill.classes || '').split(',')[0] || 'Skill'}</span>
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
            </div>
          </div>
        </div>
      )}

      {/* Collection Tab */}
      {activeTab === 'collection' && (
        <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
          <CollectionManager
            allCharacters={charactersData}
            ownedIds={Array.from(ownedCharacters)}
            onToggle={handleToggleCharacter}
            onBatchUpdate={handleBatchUpdateCollection}
          />
        </div>
      )}

      {/* Counter Builder Tab */}
      {activeTab === 'counter' && (
        <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
          <CounterBuilder allCharacters={charactersData} />
        </div>
      )}

      {/* Meta Teams Tab */}
      {activeTab === 'meta' && (
        <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
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
                      <div className="flex gap-1">
                        {skill.energy.map((e, i) => (
                          <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold capitalize border ${ENERGY_BG_COLORS[e] || 'bg-gray-700'}`}>
                            {e === 'none' ? '-' : e[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
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
