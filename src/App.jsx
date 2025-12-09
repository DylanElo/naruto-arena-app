import { useState, useMemo, useEffect } from 'react'
import charactersData from './data/characters.json'
import skillEffectsData from './data/skill_effects.json'
import { loadSkillEffects } from './engine/models.js'
import { getSuggestions, analyzeTeam, recommendPartnersForMain } from './utils/recommendationEngine'
import CollectionManager from './components/CollectionManager'
import CounterBuilder from './components/CounterBuilder'
import MetaBuilder from './components/MetaBuilder'
import TeamRadarChart from './components/visuals/TeamRadarChart'
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
        teamEnergyCounts={teamAnalysis}
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
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-1">Squad Architecture</p>
                    <h2 className="text-3xl font-black text-white glow-text">ACTIVE FORMATION</h2>
                    <p className="text-sm text-slate-400 mt-2 max-w-xl">Configure your trio. Drag and drop is simulating... waiting for deployment. Click slots to manage.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={randomizeTeam} className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
                      <span className="text-lg">🎲</span> Randomize
                    </button>
                    <button onClick={() => setSelectedTeam([])} className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-white/10 hover:border-rose-500/50 hover:text-rose-400 transition-all">
                      <span className="text-lg">✕</span> Clear
                    </button>
                    <button onClick={saveTeam} disabled={selectedTeam.length === 0 || !teamName.trim()} className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20">
                      <span className="text-lg">💾</span> Save Deck
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-[1fr,300px] gap-6 items-stretch">
                  <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-wrap gap-4 relative shadow-inner">
                    {[0, 1, 2].map((index) => {
                      const char = selectedTeam[index]
                      return (
                        <div
                          key={index}
                          className={`flex-1 min-w-[220px] rounded-2xl overflow-hidden flex transition-all relative group duration-300 ${char
                            ? 'glass-panel border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                            : 'bg-white/5 border-2 border-dashed border-white/5 hover:border-white/20 hover:bg-white/10'
                            }`}
                        >
                          {char ? (
                            <>
                              <div className="relative w-32 shrink-0 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent z-10"></div>
                                <img
                                  src={assetPath(`images/characters/${char.id}.png`)}
                                  alt={char.name}
                                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <button
                                  onClick={() => removeFromTeam(char.id)}
                                  className="absolute top-2 left-2 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="p-4 flex flex-col justify-between flex-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-cyan-500 pointer-events-none -mr-4 -mt-4">
                                  {index + 1}
                                </div>
                                <div className="relative z-10">
                                  <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mb-1">Slot {index + 1}</div>
                                  <div className="font-extrabold text-xl text-white leading-tight mb-2 text-shadow-sm">{char.name}</div>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {char.skills.slice(0, 3).map((skill, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded text-slate-300 bg-white/5 border border-white/10 capitalize">
                                        {(skill.classes || 'Skill').split(',')[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 mt-3 relative z-10">
                                  {(char.skills?.[0]?.energy ?? []).map((e, i) => (
                                    <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shadow-sm ${ENERGY_BG_COLORS[e] || 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                      {e === 'none' ? '-' : e[0].toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center w-full h-32 flex-col gap-2 relative overflow-hidden">
                              {/* Pulsing Ghost Effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-200%] group-hover:animate-shimmer"></div>
                              <span className="text-4xl text-white/10 font-thin transition-transform group-hover:scale-110 group-hover:text-cyan-400/50">+</span>
                              <span className="text-xs uppercase font-bold tracking-widest text-white/20 group-hover:text-cyan-400/50 transition-colors">Empty Slot {index + 1}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="glass-panel p-6 flex flex-col gap-6 relative overflow-hidden group min-h-[340px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    {/* View Toggle */}
                    <div className="absolute top-4 right-4 z-20 flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                      <button
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-all ${!search ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setSearch('')} // Using 'search' state hijack for this local toggle is bad practice but I'll stick to 'activeTab'-like logic if I had one. Actually, I can just show both or use a local state.
                      // I do not have local state. I will show the Radar Chart ALWAYS if there is a team, and the Tempo Stats below it.
                      // OR I can just split the view.
                      >
                        Metrics
                      </button>
                    </div>

                    {/* Integrated View */}
                    <div className="flex flex-col h-full relative z-10">
                      {selectedTeam.length > 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center -mt-4 mb-2">
                          <TeamRadarChart roles={fullTeamAnalysis.roles} size={180} />
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 mt-8 mb-8">
                          <span className="text-4xl grayscale mb-2">📊</span>
                          <p className="text-xs uppercase tracking-widest">Awaiting Data</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm pt-4 border-t border-white/5">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mb-0.5">Pressure</p>
                          <p className="text-2xl font-black text-white glow-text">{fullTeamAnalysis.tempo.pressureRating}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Est. TTK</p>
                          <p className="text-xl font-bold text-white">~{fullTeamAnalysis.tempo.estimatedKillTurns || '—'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                        <div className="bg-white/5 rounded px-2 py-1.5 border border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase">Burst</span>
                          <span className="text-white font-bold">{fullTeamAnalysis.tempo.burstDamage}</span>
                        </div>
                        <div className="bg-white/5 rounded px-2 py-1.5 border border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase">Energy</span>
                          <span className="text-white font-bold">{Object.values(teamAnalysis).reduce((a, b) => a + b, 0)}</span>
                        </div>
                      </div>
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
                  <div className="glass-panel p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 group-hover:bg-cyan-500/10 transition-all duration-700"></div>
                    <div className="flex items-start gap-3 mb-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white glow-text tracking-wide flex items-center gap-2">
                          <span className="text-cyan-400">///</span> CONTROL PALETTE
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 font-light">
                          Refine your search vectors. Filter by energy signature, combat role, or strategic effect.
                        </p>
                      </div>
                      <button
                        onClick={clearFilters}
                        className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 hover:text-white border border-cyan-900/50 hover:border-cyan-400/50 px-4 py-2 rounded transition-all"
                      >
                        Reset System
                      </button>
                    </div>

                    <div className="bg-[rgba(0,0,0,0.2)] rounded-xl p-4 border border-[var(--border-subtle)]">
                      <div className="flex flex-col md:flex-row gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Search database..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all placeholder:text-[var(--text-secondary)]/50"
                        />
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                          <input type="checkbox" checked={ownedOnly} onChange={() => setOwnedOnly(!ownedOnly)} className="accent-cyan-500" />
                          <span>Owned Assets</span>
                        </label>
                      </div>
                      {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {activeFilters.map((chip, idx) => (
                            <span key={idx} className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded border border-cyan-500/20 text-xs font-mono">
                              {chip.label}
                              <button onClick={chip.onClear} className="hover:text-white transition-colors">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Energy Signature</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['all', 'green', 'red', 'blue', 'white'].map(type => (
                            <button
                              key={type}
                              onClick={() => setEnergyFilter(type)}
                              className={`px-4 py-1.5 rounded text-xs uppercase tracking-wide border transition-all duration-300 ${energyFilter === type
                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-cyan-500/30 hover:text-cyan-400/80'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Class & Role</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['all', 'physical', 'energy', 'strategic', 'mental', 'affliction', 'instant', 'action', 'control'].map(option => (
                            <button
                              key={option}
                              onClick={() => setClassFilter(option)}
                              className={`px-4 py-1.5 rounded text-xs uppercase tracking-wide border transition-all duration-300 ${classFilter === option
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-purple-500/30 hover:text-purple-400/80'}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Strategic Effect</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['all', 'stun', 'heal', 'invulnerable', 'aoe', 'energy', 'affliction', 'setup'].map(effect => (
                            <button
                              key={effect}
                              onClick={() => setEffectFilter(effect)}
                              className={`px-4 py-1.5 rounded text-xs uppercase tracking-wide border transition-all duration-300 ${effectFilter === effect
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-400/80'}`}
                            >
                              {effect}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 border-t-0 rounded-tl-none rounded-tr-none md:rounded-2xl md:border-t mt-4 relative z-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-white glow-text">Library Index</h3>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{filteredCharacters.length} units online</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCharacters.slice(0, 60).map(char => (
                        <div
                          key={char.id}
                          className="glass-panel group cursor-pointer flex flex-col overflow-hidden hover:border-cyan-500/40 relative"
                          onClick={() => setViewCharacter(char)}
                        >
                          {/* Hover Glow Effect */}
                          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                          <div className="flex h-28 relative z-10">
                            <div className="relative">
                              <img
                                src={assetPath(`images/characters/${char.id}.png`)}
                                alt={char.name}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                                className="w-28 h-28 object-cover bg-black"
                              />
                              <div className="absolute inset-0 ring-1 ring-inset ring-white/10"></div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col gap-1.5">
                              <div>
                                <div className="text-[9px] uppercase tracking-widest text-[#555] group-hover:text-cyan-400 transition-colors font-mono">ID #{char.id}</div>
                                <h3 className="font-bold text-lg leading-tight text-white group-hover:glow-text transition-all">{char.name}</h3>
                              </div>
                              <div className="flex gap-1 flex-wrap text-[10px] text-[var(--text-secondary)]">
                                {char.skills.slice(0, 3).map((skill, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[var(--border-subtle)] capitalize">{(skill.classes || '').split(',')[0] || 'Skill'}</span>
                                ))}
                              </div>
                              <div className="flex gap-1 mt-auto">
                                {char.skills[0].energy.map((e, i) => (
                                  <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${ENERGY_BG_COLORS[e] || 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {e === 'none' ? '-' : e[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="bg-[rgba(0,0,0,0.3)] p-3 space-y-2 border-t border-[var(--border-subtle)] relative z-10">
                            {char.skills && char.skills.slice(0, 2).map((skill, idx) => (
                              <div key={idx} className="flex items-start gap-2 group/skill">
                                <div className="flex gap-0.5 mt-0.5 min-w-[32px]">
                                  {skill.energy.map((e, i) => (
                                    <span key={i} className={`w-3 h-3 rounded-[1px] ${e === 'none' ? 'bg-gray-800' : e === 'green' ? 'bg-emerald-500' : e === 'red' ? 'bg-red-500' : e === 'blue' ? 'bg-cyan-500' : 'bg-white'}`}></span>
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs text-white/90 font-medium leading-tight group-hover/skill:text-cyan-400 transition-colors">{skill.name}</div>
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-end mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToTeam(char)
                                }}
                                className="btn-primary text-xs py-1 px-4 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                              >
                                INTITIALIZE
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md" onClick={() => setViewCharacter(null)}>
          <div className="glass-panel w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--border-glow)]" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="p-8 bg-gradient-to-r from-[rgba(255,255,255,0.05)] to-transparent border-b border-[var(--border-subtle)] flex gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
              <img
                src={assetPath(`images/characters/${viewCharacter.id}.png`)}
                alt={viewCharacter.name}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Ninja' }}
                className="w-32 h-32 object-cover rounded bg-black border border-[var(--border-subtle)] shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              />
              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold text-white glow-text">{viewCharacter.name}</h2>
                    <div className="text-xs font-mono text-cyan-400 mt-1 tracking-widest">UNIT ID: {viewCharacter.id}</div>
                  </div>
                  <button onClick={() => setViewCharacter(null)} className="text-[var(--text-secondary)] hover:text-white text-2xl transition-colors">&times;</button>
                </div>
                <p className="text-[var(--text-secondary)] mt-4 text-sm leading-relaxed border-l-2 border-cyan-500/30 pl-3">{viewCharacter.description}</p>
                <button
                  onClick={() => {
                    addToTeam(viewCharacter)
                    setViewCharacter(null)
                  }}
                  className="mt-6 btn-primary w-full md:w-auto"
                >
                  ADD TO SQUAD
                </button>
              </div>
            </div>

            {/* Skills List */}
            <div className="p-6 overflow-y-auto space-y-4 bg-[rgba(0,0,0,0.2)]">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-cyan-400 rounded-full"></span> Active Abilities
              </h3>
              {viewCharacter.skills.map((skill, idx) => (
                <div key={idx} className="bg-[rgba(255,255,255,0.02)] rounded border border-[var(--border-subtle)] p-4 hover:border-[var(--border-glow)] transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">{skill.name}</h4>
                      <div className="text-xs text-cyan-400/70 font-mono mt-0.5">{skill.classes}</div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-1">
                        {skill.energy.map((e, i) => (
                          <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold capitalize border ${ENERGY_BG_COLORS[e] || 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                            {e === 'none' ? '-' : e[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase">CD</span>
                        <div className="text-sm font-bold text-white">{skill.cooldown === 'None' ? '0' : skill.cooldown}</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] opacity-80 leading-relaxed">{skill.description}</p>
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
