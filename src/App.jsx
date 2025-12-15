import { useState, useMemo, useEffect } from 'react'
import charactersData from './data/characters.json'
import { getSuggestions, analyzeTeam, recommendPartnersForMain } from './utils/recommendationEngine'
import CollectionManager from './components/CollectionManager'
import CounterBuilder from './components/CounterBuilder'
import MetaBuilder from './components/MetaBuilder'
import { assetPath } from './utils/assetPath'
import { ENERGY_BG_COLORS } from './utils/colors'

// --- ASSETS & ICONS ---
const Icons = {
  Leaf: () => <span className="text-chakra-blue">🍃</span>,
  Energy: () => <span className="text-yellow-400">⚡</span>,
  Fire: () => <span className="text-chakra-red">🔥</span>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Filter: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
}

function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('builder')
  const [search, setSearch] = useState('')
  const [energyFilter, setEnergyFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState([])
  const [viewCharacter, setViewCharacter] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // --- PERSISTENCE ---
  const [savedTeams, setSavedTeams] = useState(() => {
    const saved = localStorage.getItem('narutoArena_savedTeams')
    return saved ? JSON.parse(saved) : []
  })
  const [ownedCharacters, setOwnedCharacters] = useState(() => {
    const saved = localStorage.getItem('narutoArena_ownedCharacters')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [teamName, setTeamName] = useState('')

  useEffect(() => { localStorage.setItem('narutoArena_savedTeams', JSON.stringify(savedTeams)) }, [savedTeams])
  useEffect(() => { localStorage.setItem('narutoArena_ownedCharacters', JSON.stringify(Array.from(ownedCharacters))) }, [ownedCharacters])

  // --- HANDLERS ---
  const addToTeam = (char) => {
    if (selectedTeam.length >= 3) return
    if (selectedTeam.find(c => c.id === char.id)) return
    setSelectedTeam([...selectedTeam, char])
  }
  const removeFromTeam = (id) => setSelectedTeam(selectedTeam.filter(c => c.id !== id))
  const clearFilters = () => { setSearch(''); setEnergyFilter('all'); setClassFilter('all') }
  const handleToggleCharacter = (id) => {
    const newSet = new Set(ownedCharacters)
    newSet.has(id) ? newSet.delete(id) : newSet.add(id)
    setOwnedCharacters(newSet)
  }
  const saveTeam = () => {
    if (selectedTeam.length > 0 && teamName.trim()) {
      setSavedTeams([...savedTeams, { name: teamName, members: selectedTeam }])
      setTeamName('')
    }
  }

  // --- ANALYSIS ---
  const fullTeamAnalysis = useMemo(() => analyzeTeam(selectedTeam), [selectedTeam])
  const suggestions = useMemo(() => getSuggestions(charactersData, selectedTeam, 10, ownedCharacters), [selectedTeam, ownedCharacters])

  // --- FILTERING ---
  const filteredCharacters = useMemo(() => {
    return charactersData.filter(char => {
      if (!char) return false
      if (ownedOnly && !ownedCharacters.has(char.id)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!char.name.toLowerCase().includes(q) &&
          !(char.tags || []).some(t => t.toLowerCase().includes(q))) return false
      }
      if (energyFilter !== 'all') {
        const hasEnergy = char.skills.some(s => s.energy.some(e => e === energyFilter))
        if (!hasEnergy) return false
      }
      return true
    })
  }, [search, energyFilter, ownedOnly, ownedCharacters])

  // --- RENDER HELPERS ---
  const EnergyIcon = ({ type, size = 'w-4 h-4' }) => (
    <div className={`${size} rounded flex items-center justify-center font-bold text-[10px] uppercase border border-white/10 ${ENERGY_BG_COLORS[type] || 'bg-gray-700'}`}>
      {type === 'none' ? '-' : type[0]}
    </div>
  )

  return (
    <div className="min-h-screen bg-konoha-950 text-light-primary selection:bg-chakra-blue selection:text-konoha-950">

      {/* --- TOP BAR --- */}
      <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-4 lg:px-8 border-b border-chakra-blue/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-chakra-blue to-chakra-purple animate-pulse-slow"></div>
          <h1 className="font-display font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-chakra-blue to-white">
            SHINOBI<span className="text-chakra-blue">.OS</span>
          </h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-1 bg-konoha-900/50 p-1 rounded-full border border-konoha-700">
          {['builder', 'collection', 'counter', 'meta'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab
                  ? 'bg-chakra-blue text-konoha-950 shadow-neon-blue'
                  : 'text-light-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Mobile Toggle */}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-chakra-blue">
          ☰
        </button>
      </header>

      {/* --- MOBILE NAV OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-konoha-950/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6 animate-in slide-in-from-top-10">
          {['builder', 'collection', 'counter', 'meta'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false) }}
              className="text-2xl font-display font-bold uppercase text-white hover:text-chakra-blue"
            >
              {tab}
            </button>
          ))}
          <button onClick={() => setIsMobileMenuOpen(false)} className="mt-8 text-sm text-gray-500">CLOSE</button>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="pt-24 pb-20 px-4 lg:px-8 max-w-[1600px] mx-auto">

        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* --- LEFT: FORMATION (3 Slots) --- */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-sm font-display text-chakra-blue uppercase tracking-widest mb-1">Squad Formation</h2>
                  <div className="h-1 w-12 bg-chakra-blue shadow-neon-blue"></div>
                </div>
                <span className="font-mono text-xs text-chakra-blue/50">{selectedTeam.length} / 3 UNITS</span>
              </div>

              {/* Slots */}
              <div className="space-y-4">
                {[0, 1, 2].map(idx => {
                  const char = selectedTeam[idx]
                  return (
                    <div key={idx} className="group relative min-h-[120px] bg-konoha-800/40 border border-konoha-700 hover:border-chakra-blue/50 transition-all duration-300 rounded-lg overflow-hidden flex">
                      {char ? (
                        <>
                          {/* Image Side */}
                          <div className="w-24 relative overflow-hidden">
                            <img
                              src={assetPath(`images/characters/${char.id}.png`)}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-konoha-800/90"></div>
                          </div>

                          {/* Info Side */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative z-10">
                            <div>
                              <h3 className="font-display font-bold text-white text-lg leading-none mb-1">{char.name}</h3>
                              <div className="flex gap-1 mb-2">
                                {char.skills[0].energy.map((e, i) => <EnergyIcon key={i} type={e} size="w-3 h-3" />)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <button onClick={() => setViewCharacter(char)} className="text-[10px] uppercase tracking-wider text-chakra-blue hover:underline">Intel</button>
                              <button onClick={() => removeFromTeam(char.id)} className="text-red-500 hover:text-red-400">✕</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-konoha-700 group-hover:text-chakra-blue/50 transition-colors">
                          <span className="text-4xl font-display opacity-20">{idx + 1}</span>
                          <span className="text-[10px] uppercase tracking-widest opacity-50">Empty Slot</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Stats / Intel Panel */}
              <div className="glass-panel p-5 rounded-lg space-y-4">
                <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-chakra-red rounded-full animate-pulse"></span>
                  Mission Intel
                </h3>

                {selectedTeam.length > 0 ? (
                  <div className="space-y-3">
                    {/* Missing Capabilities Warnings */}
                    {(fullTeamAnalysis.missingCapabilities || []).slice(0, 3).map((gap, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-orange-400 bg-orange-400/10 p-2 rounded border border-orange-400/20">
                        <span>⚠️</span> {gap.replace('Missing: ', '')} Deficit
                      </div>
                    ))}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-konoha-900 p-2 rounded">
                        <div className="text-[10px] text-gray-500 uppercase">Pressure</div>
                        <div className="text-xl font-display text-chakra-blue">{fullTeamAnalysis.tempo.pressureRating}%</div>
                      </div>
                      <div className="bg-konoha-900 p-2 rounded">
                        <div className="text-[10px] text-gray-500 uppercase">Est. TTK</div>
                        <div className="text-xl font-display text-white">{fullTeamAnalysis.tempo.estimatedKillTurns || '-'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-600">
                    Deploy units to activate tactical analysis.
                  </div>
                )}

                {/* Save Team */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    className="bg-konoha-900 border border-konoha-700 rounded px-3 py-2 text-xs w-full text-white placeholder-gray-600 focus:border-chakra-blue outline-none"
                    placeholder="Operation Name..."
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  <button onClick={saveTeam} className="bg-chakra-blue text-konoha-950 px-4 py-2 text-xs font-bold rounded hover:bg-white transition-colors clip-tech">
                    SAVE
                  </button>
                </div>
              </div>
            </div>

            {/* --- RIGHT: ARCHIVE (Picker) --- */}
            <div className="lg:col-span-8 space-y-6">

              {/* Controls */}
              <div className="glass-panel p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-auto flex-1">
                  <input
                    className="w-full bg-konoha-900 border border-konoha-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-chakra-blue/50 outline-none"
                    placeholder="Search archive..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="absolute left-3 top-2.5 text-gray-500"><Icons.Search /></div>
                </div>

                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
                  {['all', 'red', 'green', 'blue', 'white'].map(color => (
                    <button
                      key={color}
                      onClick={() => setEnergyFilter(color)}
                      className={`w-8 h-8 rounded flex items-center justify-center border transition-all ${energyFilter === color
                          ? 'border-chakra-blue bg-chakra-blue/20 text-chakra-blue shadow-neon-blue'
                          : 'border-konoha-700 bg-konoha-800 text-gray-500 hover:border-gray-500'
                        }`}
                    >
                      {color === 'all' ? '*' : <div className={`w-3 h-3 rounded-full ${ENERGY_BG_COLORS[color]}`}></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Suggestions (Highlighted) */}
                {selectedTeam.length > 0 && selectedTeam.length < 3 && suggestions.map(char => (
                  <div key={char.id} onClick={() => setViewCharacter(char)} className="relative group cursor-pointer">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-chakra-blue opacity-50 blur group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative h-full bg-konoha-900 border border-yellow-500/30 rounded-lg p-3 flex flex-col gap-2 hover:bg-konoha-800">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-yellow-500 text-xs uppercase tracking-wider">Suggested</h4>
                        <div className="text-[10px] font-mono text-chakra-blue">{char.synergyScore} SYN</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src={assetPath(`images/characters/${char.id}.png`)} className="w-10 h-10 rounded border border-yellow-500/50 object-cover" onError={(e) => e.target.style.display = 'none'} />
                        <div>
                          <div className="font-bold text-sm text-white leading-tight">{char.name}</div>
                          <div className="text-[10px] text-gray-400">{char.skills[0].classes.split(',')[0]}</div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); addToTeam(char) }} className="mt-auto w-full py-1 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 text-xs font-bold rounded hover:bg-yellow-500 hover:text-black transition-colors">
                        RECRUIT
                      </button>
                    </div>
                  </div>
                ))}

                {/* Standard List */}
                {filteredCharacters.map(char => (
                  <div key={char.id} onClick={() => setViewCharacter(char)} className="bg-konoha-800 border border-konoha-700 rounded-lg overflow-hidden cursor-pointer hover:border-chakra-blue/50 hover:shadow-neon-blue transition-all duration-300 group flex flex-col h-full">
                    <div className="aspect-square relative overflow-hidden bg-konoha-900">
                      <img
                        src={assetPath(`images/characters/${char.id}.png`)}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=?' }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-konoha-950 to-transparent">
                        <div className="font-bold text-sm text-white truncate">{char.name}</div>
                      </div>
                      {/* Add Button Overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); addToTeam(char) }} className="bg-chakra-blue text-black w-8 h-8 rounded flex items-center justify-center font-bold text-xl hover:scale-110 active:scale-95 transition-transform shadow-neon-blue">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="p-2 bg-konoha-800 flex gap-1 flex-wrap">
                      {char.skills.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex gap-0.5">
                          {s.energy.map((e, i) => <div key={i} className={`w-2 h-2 rounded-full ${ENERGY_BG_COLORS[e]}`}></div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- OTHER TABS (Placeholder Wrapper) --- */}
        {activeTab === 'collection' && <div className="glass-panel p-8 rounded-xl"><CollectionManager allCharacters={charactersData} ownedIds={Array.from(ownedCharacters)} onToggle={handleToggleCharacter} /></div>}
        {activeTab === 'meta' && <div className="glass-panel p-8 rounded-xl"><MetaBuilder allCharacters={charactersData} /></div>}
        {activeTab === 'counter' && <div className="glass-panel p-8 rounded-xl"><CounterBuilder allCharacters={charactersData} /></div>}

      </main>

      {/* --- MODAL (View Character) --- */}
      {viewCharacter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-konoha-950/90 backdrop-blur-md" onClick={() => setViewCharacter(null)}>
          <div className="bg-konoha-900 border border-chakra-blue w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="relative h-48">
              <img src={assetPath(`images/characters/${viewCharacter.id}.png`)} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-konoha-900 to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <h2 className="text-4xl font-display font-bold text-white mb-1">{viewCharacter.name}</h2>
                <div className="flex gap-2">
                  {(viewCharacter.tags || []).map(t => <span key={t} className="px-2 py-0.5 rounded bg-white/10 text-[10px] uppercase tracking-wider">{t}</span>)}
                </div>
              </div>
              <button onClick={() => setViewCharacter(null)} className="absolute top-4 right-4 text-white hover:text-chakra-blue text-2xl">✕</button>
            </div>

            {/* Skills */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {viewCharacter.skills.map((skill, i) => (
                <div key={i} className="bg-konoha-800 p-4 rounded-lg border border-konoha-700 flex gap-4">
                  <div className="flex flex-col gap-1 items-center min-w-[50px]">
                    <div className="flex gap-0.5">
                      {skill.energy.map((e, idx) => <div key={idx} className={`w-3 h-3 rounded ${ENERGY_BG_COLORS[e]}`}></div>)}
                    </div>
                    {skill.cooldown !== 'None' && <div className="text-[10px] text-gray-500">{skill.cooldown} CD</div>}
                  </div>
                  <div>
                    <h4 className="font-bold text-chakra-blue text-sm uppercase mb-1">{skill.name}</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{skill.description}</p>
                    <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-wider">{skill.classes}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-konoha-700 flex justify-end">
              <button onClick={() => { addToTeam(viewCharacter); setViewCharacter(null) }} className="px-8 py-3 bg-chakra-blue text-black font-bold uppercase tracking-widest hover:bg-white transition-colors clip-tech shadow-neon-blue">
                Add to Squad
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default App
