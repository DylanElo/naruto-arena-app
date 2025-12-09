import { useState, useMemo, useEffect } from 'react'
import charactersData from './data/characters.json'
import skillEffectsData from './data/skill_effects.json'
import { loadSkillEffects } from './engine/models.js'
import { getSuggestions, analyzeTeam, recommendPartnersForMain } from './utils/recommendationEngine'
import CollectionManager from './components/CollectionManager'
import CounterBuilder from './components/CounterBuilder'
import MetaBuilder from './components/MetaBuilder'
import { assetPath } from './utils/assetPath'
import Header from './components/layout/Header'
import { ENERGY_BG_COLORS } from './utils/colors'

// Initialize structured skill effects data at app startup
loadSkillEffects(skillEffectsData)


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
  useEffect(() => {
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
    if (selectedTeam.length === 0) return [];

    const ownedIds = ownedCharacters.size > 0 ? ownedCharacters : null;

    if (selectedTeam.length === 1) {
      const recommendations = recommendPartnersForMain(selectedTeam[0], charactersData, ownedIds, 5);
      return recommendations.map(char => {
        const teamAnalysis = analyzeTeam([...selectedTeam, char]);
        return {
          ...char,
          synergyBreakdown: teamAnalysis.synergyBreakdown,
        };
      });
    }

    const suggestions = getSuggestions(charactersData, selectedTeam, 5, ownedIds);
    return suggestions.map(char => {
      const teamAnalysis = analyzeTeam([...selectedTeam, char]);
      return {
        ...char,
        synergyBreakdown: teamAnalysis.synergyBreakdown,
      };
    });
  }, [selectedTeam, ownedCharacters]);

  // Full Team Analysis (strengths, weaknesses, strategies)
  const fullTeamAnalysis = useMemo(() => {
    return analyzeTeam(selectedTeam)
  }, [selectedTeam])

  const ownedProgress = Math.round((ownedCharacters.size / charactersData.length) * 100)

  return (
    <div className="dark min-h-screen bg-dark-primary text-light-primary font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fullTeamAnalysis={fullTeamAnalysis}
        teamEnergyMix={teamEnergyMix}
        ownedProgress={ownedProgress}
        ownedCharacters={ownedCharacters}
        charactersData={charactersData}
        selectedTeam={selectedTeam}
      />

      {/* Team Builder Tab */}
      {activeTab === 'builder' && (
        <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <div className="space-y-6">
              <div className="bg-dark-secondary border border-dark-tertiary rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-primary">Deck tray</p>
                    <h2 className="text-3xl font-black text-light-primary">Glass slots with quick gestures</h2>
                    <p className="text-sm text-light-secondary leading-relaxed">Tap a card to peek at the full profile, press + to instantly reserve it, or use the randomizer to test weird synergies.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={randomizeTeam} className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl font-semibold text-dark-primary shadow-lg">Shuffle trio</button>
                    <button onClick={() => setSelectedTeam([])} className="px-4 py-2 bg-dark-secondary border border-dark-tertiary rounded-xl font-semibold text-light-primary hover:border-rose-500 hover:text-rose-500">Clear board</button>
                    <button onClick={saveTeam} disabled={selectedTeam.length === 0 || !teamName.trim()} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-dark-tertiary disabled:text-light-secondary/50 rounded-xl font-semibold text-dark-primary">Save deck</button>
                  </div>
                </div>

                <div className="grid md:grid-cols-[1fr,280px] gap-4 items-stretch">
                  <div className="bg-dark-primary border border-dark-tertiary rounded-2xl p-4 flex flex-wrap gap-3 shadow-inner">
                    {[0, 1, 2].map((index) => {
                      const char = selectedTeam[index]
                      return (
                        <div
                          key={index}
                          className="flex-1 min-w-[220px] bg-dark-secondary border border-dark-tertiary rounded-2xl overflow-hidden flex hover:border-brand-primary/60 transition-all"
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
                                  className="absolute top-2 right-2 bg-dark-primary/90 text-light-secondary rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-rose-500 hover:text-white transition-colors"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="p-3 flex flex-col justify-between flex-1">
                                <div>
                                  <div className="text-xs uppercase text-brand-primary">Slot {index + 1}</div>
                                  <div className="font-bold text-lg text-light-primary leading-tight">{char.name}</div>
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {char.skills.slice(0, 3).map((skill, i) => (
                                      <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-dark-tertiary border border-dark-tertiary text-light-secondary capitalize">
                                        {(skill.classes || 'Skill').split(',')[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1 mt-3">
                                  {(char.skills?.[0]?.energy ?? []).map((e, i) => (
                                    <span key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-dark-tertiary border-dark-tertiary text-light-secondary'}`}>
                                      {e === 'none' ? '-' : e[0].toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full h-24 text-light-secondary/50 text-sm gap-2">
                              <span className="text-xl">＋</span>
                              <span>Select a shinobi</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-dark-primary border border-dark-tertiary rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase text-brand-primary">Team Synergy</p>
                        <p className="text-2xl font-bold text-light-primary">{fullTeamAnalysis.synergyScore}%</p>
                      </div>
                      <div className="text-right text-xs text-light-secondary/70">
                        <p>TTK: {fullTeamAnalysis.tempo.estimatedKillTurns ?? '—'}</p>
                        <p>Cost to Kill: {fullTeamAnalysis.tempo.costToKill ?? '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-dark-secondary rounded-lg p-3 border border-dark-tertiary">
                        <p className="text-light-secondary/70">Burst</p>
                        <p className="text-light-primary text-lg font-semibold">{fullTeamAnalysis.tempo.burstDamage || 0} dmg</p>
                      </div>
                      <div className="bg-dark-secondary rounded-lg p-3 border border-dark-tertiary">
                        <p className="text-light-secondary/70">Pressure</p>
                        <p className="text-light-primary text-lg font-semibold">{fullTeamAnalysis.tempo.pressureRating || 0}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      {Object.entries(teamAnalysis).map(([type, count]) => (
                        count > 0 && (
                          <span key={type} className={`px-2 py-1 rounded-full border ${ENERGY_BG_COLORS[type] || 'bg-dark-tertiary'}`}>
                            {type.toUpperCase()} · {count}
                          </span>
                        )
                      ))}
                      {Object.values(teamAnalysis).every(v => v === 0) && (
                        <span className="text-light-secondary/50">Add characters to see energy mix</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-[1.1fr,0.9fr] gap-4">
                  <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-4 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-brand-primary">Deck slots</h2>
                        <p className="text-xs text-light-secondary/70">Tap a card to open quick view.</p>
                      </div>
                      <span className="text-sm bg-dark-tertiary px-2 py-1 rounded text-light-primary">{selectedTeam.length}/3</span>
                    </div>
                    <div className="space-y-3">
                      {[0, 1, 2].map(index => {
                        const char = selectedTeam[index]
                        return (
                          <div key={index} className="h-24 bg-dark-primary/40 rounded-lg border-2 border-dashed border-dark-tertiary relative flex items-center justify-between overflow-hidden px-3">
                            {char ? (
                              <div className="flex items-center gap-3 w-full">
                                <img
                                  src={assetPath(`images/characters/${char.id}.png`)}
                                  alt={char.name}
                                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                                  className="h-20 w-20 object-cover rounded-lg border border-dark-tertiary"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate text-light-primary">{char.name}</div>
                                  <div className="text-[11px] text-light-secondary/70 truncate">{char.skills.map(s => s.name).slice(0, 2).join(' • ')}</div>
                                  <div className="flex gap-1 mt-2">
                                    {(char.skills?.[0]?.energy ?? []).map((e, i) => (
                                      <span key={i} className={`w-6 h-6 rounded border text-[10px] font-bold flex items-center justify-center ${ENERGY_BG_COLORS[e] || 'bg-dark-tertiary'}`}>
                                        {e === 'none' ? '-' : e[0].toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <button onClick={() => setViewCharacter(char)} className="text-xs text-brand-primary hover:text-brand-secondary">Open card</button>
                                  <button onClick={() => removeFromTeam(char.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-light-secondary/50 text-sm">Empty Slot</div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-dark-tertiary">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-2">
                        <input
                          type="text"
                          placeholder="Name this deck"
                          className="w-full bg-dark-primary border border-dark-tertiary rounded p-2 text-sm text-light-primary focus:border-brand-primary outline-none"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                        />
                        <button
                          onClick={saveTeam}
                          disabled={selectedTeam.length === 0 || !teamName.trim()}
                          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-dark-tertiary disabled:text-light-secondary/50 text-white text-sm py-2 rounded transition-colors font-bold"
                        >
                          Save Deck
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-4 shadow-lg flex flex-col gap-4">
                    <div>
                      <h3 className="font-bold text-light-primary flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">★</span> Suggested teammates
                      </h3>
                      <p className="text-[11px] text-light-secondary/70">Tap to preview full card, or quick add.</p>
                    </div>
                    <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                      {suggestions.map(char => (
                        <div key={char.id} className="bg-dark-primary/50 p-2 rounded border border-dark-tertiary flex flex-col group cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setViewCharacter(char)}>
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-10 h-10 bg-dark-primary rounded flex items-center justify-center text-[10px] text-light-secondary/50 overflow-hidden border border-dark-tertiary">
                                <img
                                  src={assetPath(`images/characters/${char.id}.png`)}
                                  alt={char.name}
                                  onError={(e) => { e.target.style.display = 'none' }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-light-primary truncate">{char.name}</div>
                                <div className="text-[10px] text-green-400">Synergy Score: {char.synergyScore}</div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToTeam(char)
                              }}
                              className="text-brand-primary hover:text-brand-secondary text-lg px-2"
                              title="Add to Team"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-xs text-light-secondary/70 mt-2 p-2 bg-dark-primary/50 rounded w-full">
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div title="Role Score">Roles: {char.synergyBreakdown?.roleScore || 0}</div>
                              <div title="Mechanic Score">Mechs: {char.synergyBreakdown?.mechanicScore || 0}</div>
                              <div title="Combo Score">Combo: {char.synergyBreakdown?.comboScore || 0}</div>
                              <div title="Pressure Rating">Pressure: {char.synergyBreakdown?.pressureRating || 0}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {suggestions.length === 0 && (
                        <div className="text-sm text-light-secondary/50">Add at least one hero to start seeing synergies.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
                <div className="space-y-6">
                  {savedTeams.length > 0 && (
                    <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-4 shadow-lg max-h-60 overflow-y-auto">
                      <h3 className="font-bold text-light-secondary mb-3 flex justify-between items-center">
                        Saved decks
                        <span className="text-xs bg-dark-tertiary px-2 py-1 rounded text-light-secondary/70">{savedTeams.length}</span>
                      </h3>
                      <div className="space-y-2">
                        {savedTeams.map((team, idx) => (
                          <div key={idx} className="bg-dark-primary/50 p-2 rounded border border-dark-tertiary flex justify-between items-center group">
                            <div className="min-w-0 flex-1 mr-2">
                              <div className="font-bold text-sm text-brand-primary truncate">{team.name}</div>
                              <div className="text-xs text-light-secondary/50 truncate">
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

                  <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-light-primary flex items-center gap-2">Mission log</h3>
                        <p className="text-xs text-light-secondary/70">Auto-notes from the analyzer</p>
                      </div>
                      <span className="text-xs bg-dark-primary px-3 py-1 rounded-full border border-dark-tertiary">Live</span>
                    </div>
                    <div className="space-y-2 text-sm text-light-secondary">
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
                        <p className="text-light-secondary/50 text-sm">Pick anyone to start receiving analysis notes.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-5 shadow-lg">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-light-primary">Control palette</h3>
                        <p className="text-sm text-light-secondary/70">Layered filters and toggles to curate your roster preview.</p>
                      </div>
                      <button onClick={clearFilters} className="text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:text-brand-secondary">Reset all</button>
                    </div>

                    <div className="bg-dark-primary/30 rounded-xl p-3 border border-dark-tertiary">
                      <div className="flex flex-col md:flex-row gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Search ninjas, clan names, or tags"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-dark-primary/80 border border-dark-tertiary/10 rounded-lg px-4 py-3 text-sm text-light-primary focus:outline-none focus:border-brand-primary"
                        />
                        <label className="flex items-center gap-2 text-sm text-light-primary bg-dark-primary/60 border border-dark-tertiary rounded-lg px-4 py-2">
                          <input type="checkbox" checked={ownedOnly} onChange={() => setOwnedOnly(!ownedOnly)} className="accent-brand-primary" />
                          Owned only
                        </label>
                      </div>
                      {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeFilters.map((chip, idx) => (
                            <span key={idx} className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-secondary px-3 py-1 rounded-full border border-brand-primary/30 text-xs">
                              {chip.label}
                              <button onClick={chip.onClear} className="text-brand-primary/80 hover:text-white">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-light-secondary/70">Energy</p>
                        <p className="text-[11px] text-light-secondary/50">Prioritize your opening hand</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'green', 'red', 'blue', 'white'].map(type => (
                          <button
                            key={type}
                            onClick={() => setEnergyFilter(type)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${energyFilter === type ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary border-brand-secondary' : 'bg-dark-primary/60 border-dark-tertiary/10 text-light-primary hover:border-brand-primary/60'}`}
                          >
                            {type === 'all' ? 'All energy' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-light-secondary/70">Class focus</p>
                        <p className="text-[11px] text-light-secondary/50">Balance control vs burst</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'physical', 'energy', 'strategic', 'mental', 'affliction', 'instant', 'action', 'control'].map(option => (
                          <button
                            key={option}
                            onClick={() => setClassFilter(option)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${classFilter === option ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-dark-primary border-sky-200' : 'bg-dark-primary/60 border-dark-tertiary/10 text-light-primary hover:border-sky-300/60'}`}
                          >
                            {option === 'all' ? 'All classes' : option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-light-secondary/70">Card effect</p>
                        <p className="text-[11px] text-light-secondary/50">Find the tools you need</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['all', 'stun', 'heal', 'invulnerable', 'aoe', 'energy', 'affliction', 'setup'].map(effect => (
                          <button
                            key={effect}
                            onClick={() => setEffectFilter(effect)}
                            className={`px-3 py-2 rounded-full text-sm border transition-colors shadow-sm ${effectFilter === effect ? 'bg-gradient-to-r from-fuchsia-400 to-purple-700 text-dark-primary border-fuchsia-200' : 'bg-dark-primary/60 border-dark-tertiary/10 text-light-primary hover:border-fuchsia-300/60'}`}
                          >
                            {effect === 'all' ? 'All effects' : effect.charAt(0).toUpperCase() + effect.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-secondary/5 rounded-2xl border border-dark-tertiary/10 p-4 shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Character library</h3>
                        <p className="text-xs text-light-secondary/70">Top 60 results shown live.</p>
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded-full border border-dark-tertiary/20 text-light-primary/80">{filteredCharacters.length} matches</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCharacters.slice(0, 60).map(char => (
                        <div
                          key={char.id}
                          className="bg-dark-primary/70 rounded-2xl border border-dark-tertiary/10 hover:border-brand-primary/70 transition-all hover:shadow-xl hover:shadow-brand-primary/20 overflow-hidden group cursor-pointer flex flex-col backdrop-blur"
                          onClick={() => setViewCharacter(char)}
                        >
                          <div className="flex h-28">
                            <img
                              src={assetPath(`images/characters/${char.id}.png`)}
                              alt={char.name}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                              className="w-28 h-28 object-cover bg-dark-primary/70"
                            />
                            <div className="p-3 flex-1 flex flex-col gap-2">
                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-brand-primary/80">Card #{char.id}</div>
                                <h3 className="font-bold text-lg leading-tight group-hover:text-brand-primary transition-colors">{char.name}</h3>
                              </div>
                              <div className="flex gap-1 flex-wrap text-[11px] text-light-secondary">
                                {char.skills.slice(0, 3).map((skill, idx) => (
                                  <span key={idx} className="px-2 py-1 rounded-full bg-dark-primary/60 border border-dark-tertiary/10 capitalize">{(skill.classes || '').split(',')[0] || 'Skill'}</span>
                                ))}
                              </div>
                              <div className="flex gap-1">
                                {char.skills[0].energy.map((e, i) => (
                                  <span key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-dark-tertiary/70 border-dark-tertiary'}`}>
                                    {e === 'none' ? '-' : e[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="bg-dark-primary/50 p-3 space-y-2">
                            {char.skills && char.skills.slice(0, 2).map((skill, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="flex gap-1 mt-1">
                                  {skill.energy.map((e, i) => (
                                    <span key={i} className={`w-5 h-5 rounded border text-[9px] font-bold flex items-center justify-center ${ENERGY_BG_COLORS[e] || 'bg-dark-tertiary/70 border-dark-tertiary'}`}>
                                      {e === 'none' ? '-' : e[0].toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-light-primary font-semibold leading-tight">{skill.name}</div>
                                  <div className="text-[11px] text-light-secondary/70 truncate">{skill.description}</div>
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
                      <div className="text-center text-light-secondary/50 py-12">No characters found matching your filters.</div>
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
