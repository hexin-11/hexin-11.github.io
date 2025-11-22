import React, { useState } from 'react';
import { ViewState, Profile, Note, Hobby, SocialPost, GalleryItem, ResumeSection, Attachment, LifePlan, PlanBlock, TravelLog } from './types';
import { EditableText } from './components/EditableText';
import { NoteEditor } from './components/NoteEditor';
import { polishText, getCityCoordinates } from './services/geminiService';
import { 
  Home, BookOpen, Heart, MessageCircle, Image as ImageIcon, TrendingUp, 
  Plus, Camera, X, Edit3, Sparkles, Settings, Upload,
  ArrowLeft, Trash2, ImagePlus, MoreHorizontal, Palette, Paperclip, FileText, ExternalLink,
  Map as MapIcon, Globe, CheckSquare, List, Heading1, Heading2, Heading3, Table as TableIcon, MousePointerClick, Save, Loader2
} from 'lucide-react';

// --- INITIAL DATA (CHINESE) ---
const INITIAL_PROFILE: Profile = {
  name: 'HEXIN',
  major: '计算机科学',
  school: '高丽大学',
  year: '24届',
  mbti: 'ENFJ',
  avatar: 'https://picsum.photos/200/200?random=1',
  aboutMe: "我是一个充满活力的ENFJ，热爱编程、摄影和探索新文化！目前在首尔学习计算机科学。随时准备迎接新的冒险。",
};

const INITIAL_NOTES: Note[] = [
  { id: '1', title: '机器学习', subtitle: '252R (本科)', color: 'bg-teal-700', blocks: [] },
  { id: '2', title: '创业精神', subtitle: '252R (本科)', color: 'bg-stone-700', blocks: [] },
  { id: '3', title: '大众文化研究', subtitle: '252R (本科)', color: 'bg-purple-700', blocks: [] },
  { id: '4', title: '信息积思考', subtitle: '252R (本科)', color: 'bg-orange-700', blocks: [] },
  { id: '5', title: '计算机构造', subtitle: '252R (本科)', color: 'bg-emerald-800', blocks: [] },
];

const INITIAL_POSTS: SocialPost[] = [];

const INITIAL_RESUME: ResumeSection[] = [
  { 
    id: '1', 
    title: '教育经历', 
    items: [
      { id: 'edu1', title: '高丽大学', subtitle: '计算机科学 / 本科', date: '2020 - 2024', description: '主修计算机科学，辅修心理学。', attachments: [] }
    ] 
  },
  { 
    id: '2', 
    title: '自我评价', 
    items: [
      { id: 'self1', title: '个人总结', subtitle: '', date: '2024', description: '具备很强的团队协作能力(ENFJ)，热衷于解决复杂的技术问题。对待生活充满热情，喜欢尝试新鲜事物。', attachments: [] }
    ] 
  },
  { id: '3', title: '在校经历', items: [] },
  { id: '4', title: '相关技能', items: [] },
  { id: '5', title: '成绩单', items: [] },
  { id: '6', title: '证明书', items: [] },
];

const INITIAL_PLANS: LifePlan[] = [
    {
        id: '1',
        title: '大学毕业规划',
        date: '2025',
        blocks: [
            { id: 'b1', type: 'h1', content: '短期目标' },
            { id: 'b2', type: 'todo', content: '完成毕业论文', checked: false },
            { id: 'b3', type: 'todo', content: '寻找实习机会', checked: true },
        ]
    }
];

const INITIAL_TRAVELS: TravelLog[] = [];

// --- HELPER: Mercator Projection Conversion ---
// Maps Lat/Lng to X%/Y% on a standard Mercator map image
const latLngToMapPercent = (lat: number, lng: number): { x: number, y: number } => {
    // Longitude: -180 to 180
    const x = (lng + 180) / 360 * 100;

    // Latitude: -85 to 85 (Mercator cutoff)
    // Formula: ln(tan(pi/4 + lat/2))
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    // Standard Map Height usually covers approx -85 to 85 degrees latitude
    // Y range for full square mercator is -PI to PI
    // y = 0.5 - mercN / (2 * PI)  (0 at top, 1 at bottom)
    const y = (0.5 - mercN / (2 * Math.PI)) * 100;

    // Adjustments for specific map image crop might be needed, but this is standard.
    // The Wikimedia Mercator image usually fits this reasonably well.
    // We clamp Y to avoid drawing off-screen for extreme poles.
    const clampedY = Math.max(0, Math.min(100, y));
    
    return { x, y: clampedY };
};

// --- SHARED COMPONENTS ---

interface SharedPageProps {
  backgrounds: Record<string, string>;
  setBackgrounds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  navigate: (v: ViewState) => void;
}

interface PageContainerProps extends SharedPageProps {
  children: React.ReactNode;
  viewId: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
    children, 
    viewId,
    backgrounds,
    setBackgrounds,
    navigate
}) => {
    const bg = backgrounds[viewId];
    
    const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          const reader = new FileReader();
          reader.onload = () => setBackgrounds(prev => ({...prev, [viewId]: reader.result as string}));
          reader.readAsDataURL(file);
      }
    };

    return (
        <div 
          className="min-h-full w-full relative transition-all duration-500 bg-cover bg-center bg-fixed animate-fade-in"
          style={{
              backgroundImage: bg ? `url(${bg})` : undefined,
              backgroundColor: bg ? 'transparent' : '#fff7ed' // default orange-50
          }}
        >
            {bg && <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-0 pointer-events-none" />}
            
            <div className="relative z-10 flex flex-col min-h-[calc(100vh-80px)]">
                 {/* Page Header Tools */}
                 <div className="flex justify-between items-center p-4">
                      {viewId !== 'HOME' ? (
                          <button 
                              onClick={() => navigate('HOME')}
                              className="flex items-center gap-2 bg-white/40 hover:bg-white/70 text-orange-700 px-5 py-2.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] backdrop-blur-md border border-white/50 transition-all duration-300 font-bold text-sm z-50 hover:-translate-y-0.5 active:scale-95 active:shadow-sm"
                              title="退出并返回首页"
                          >
                              <ArrowLeft className="w-4 h-4" /> 返回首页
                          </button>
                      ) : <div></div>}

                      <label className="cursor-pointer bg-white/40 hover:bg-white/70 text-gray-700 p-2.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] backdrop-blur-md border border-white/50 transition-all duration-300 hover:-translate-y-0.5 active:scale-95" title="更换当前背景">
                           <Settings className="w-5 h-5" />
                           <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundChange} />
                      </label>
                 </div>
                 
                 {children}
            </div>
        </div>
    )
};

// --- SUB-COMPONENT: PLAN EDITOR BLOCK ---
const PlanBlockItem = ({ 
    block, 
    updateBlock, 
    deleteBlock 
}: { 
    block: PlanBlock, 
    updateBlock: (b: PlanBlock) => void,
    deleteBlock: (id: string) => void
}) => {
    
    // Table Helpers
    const addTableRow = () => {
        const currentData = block.tableData || [['Cell 1', 'Cell 2']];
        const cols = currentData[0].length;
        const newRow = Array(cols).fill('');
        updateBlock({ ...block, tableData: [...currentData, newRow] });
    };
    const addTableCol = () => {
        const currentData = block.tableData || [['Cell 1']];
        const newData = currentData.map(row => [...row, '']);
        updateBlock({ ...block, tableData: newData });
    };
    const updateTableCell = (rIndex: number, cIndex: number, val: string) => {
        const currentData = block.tableData || [];
        const newData = currentData.map((row, r) => {
            if (r === rIndex) {
                return row.map((cell, c) => c === cIndex ? val : cell);
            }
            return row;
        });
        updateBlock({ ...block, tableData: newData });
    };

    return (
        <div className="group relative flex items-start gap-2 mb-2 p-1 rounded hover:bg-gray-50/50">
            {/* Type Indicator / Delete */}
            <button 
                onClick={() => deleteBlock(block.id)}
                className="absolute -left-8 top-1.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex-1">
                {block.type === 'h1' && (
                    <EditableText 
                        value={block.content} 
                        onChange={v => updateBlock({...block, content: v})} 
                        className="text-3xl font-bold text-gray-900 border-b border-gray-200 pb-2 mt-4 mb-2"
                        placeholder="一级标题"
                    />
                )}
                {block.type === 'h2' && (
                    <EditableText 
                        value={block.content} 
                        onChange={v => updateBlock({...block, content: v})} 
                        className="text-2xl font-bold text-gray-800 mt-3 mb-1"
                        placeholder="二级标题"
                    />
                )}
                {block.type === 'h3' && (
                    <EditableText 
                        value={block.content} 
                        onChange={v => updateBlock({...block, content: v})} 
                        className="text-xl font-bold text-gray-700 mt-2 mb-1"
                        placeholder="三级标题"
                    />
                )}
                {block.type === 'text' && (
                    <EditableText 
                        value={block.content} 
                        onChange={v => updateBlock({...block, content: v})} 
                        multiline
                        className="text-base text-gray-700 leading-relaxed min-h-[1.5em]"
                        placeholder="输入正文..."
                    />
                )}
                {block.type === 'todo' && (
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={block.checked} 
                            onChange={(e) => updateBlock({...block, checked: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                        <EditableText 
                            value={block.content} 
                            onChange={v => updateBlock({...block, content: v})} 
                            className={`flex-1 text-gray-800 ${block.checked ? 'line-through text-gray-400' : ''}`}
                            placeholder="待办事项"
                        />
                    </div>
                )}
                {block.type === 'bullet' && (
                    <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none text-gray-400">•</span>
                        <EditableText 
                            value={block.content} 
                            onChange={v => updateBlock({...block, content: v})} 
                            multiline
                            className="flex-1 text-gray-800"
                            placeholder="列表项"
                        />
                    </div>
                )}
                {block.type === 'table' && (
                    <div className="overflow-x-auto my-2 p-2 bg-white rounded border border-gray-200 shadow-sm">
                        <table className="w-full border-collapse">
                            <tbody>
                                {(block.tableData || [['']]).map((row, rIndex) => (
                                    <tr key={rIndex}>
                                        {row.map((cell, cIndex) => (
                                            <td key={cIndex} className="border border-gray-300 p-1 min-w-[100px]">
                                                <input 
                                                    value={cell} 
                                                    onChange={(e) => updateTableCell(rIndex, cIndex, e.target.value)}
                                                    className="w-full outline-none bg-transparent px-1 py-0.5"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex gap-2 mt-2 text-xs">
                            <button onClick={addTableRow} className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 flex items-center gap-1">+ 行</button>
                            <button onClick={addTableCol} className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 flex items-center gap-1">+ 列</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- VIEW COMPONENTS ---

const LifePlanView = ({
    plans, setPlans, travels, setTravels, ...props
}: {
    plans: LifePlan[],
    setPlans: React.Dispatch<React.SetStateAction<LifePlan[]>>,
    travels: TravelLog[],
    setTravels: React.Dispatch<React.SetStateAction<TravelLog[]>>,
} & SharedPageProps) => {
    const [activeTab, setActiveTab] = useState<'PLANS' | 'TRAVEL'>('PLANS');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // --- TRAVEL LOG STATE (Modal) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [tempLogName, setTempLogName] = useState('');
    const [tempLogThoughts, setTempLogThoughts] = useState('');
    const [tempLogAttachments, setTempLogAttachments] = useState<Attachment[]>([]);
    const [pendingLocation, setPendingLocation] = useState<{x: number, y: number} | null>(null);

    // --- PLAN LOGIC ---
    const addPlan = () => {
        const newPlan: LifePlan = {
            id: Date.now().toString(),
            title: '新的人生规划',
            date: new Date().getFullYear().toString(),
            blocks: [{ id: Date.now().toString() + '1', type: 'h1', content: '规划目标' }]
        };
        setPlans(prev => [...prev, newPlan]);
        setSelectedPlanId(newPlan.id);
    };

    const deletePlan = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm('确定删除这个规划吗？')) {
            setPlans(prev => prev.filter(p => p.id !== id));
            if(selectedPlanId === id) setSelectedPlanId(null);
        }
    };

    const addBlockToPlan = (planId: string, type: string) => {
        setPlans(prev => prev.map(p => {
            if(p.id === planId) {
                return {
                    ...p,
                    blocks: [...p.blocks, { 
                        id: Date.now().toString(), 
                        type: type as any, 
                        content: '', 
                        checked: false,
                        tableData: type === 'table' ? [['', ''], ['', '']] : undefined
                    }]
                }
            }
            return p;
        }));
    };

    const updateBlock = (planId: string, updatedBlock: PlanBlock) => {
        setPlans(prev => prev.map(p => {
            if(p.id === planId) {
                return { ...p, blocks: p.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b) };
            }
            return p;
        }));
    };

    const deleteBlock = (planId: string, blockId: string) => {
        setPlans(prev => prev.map(p => {
            if(p.id === planId) {
                return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
            }
            return p;
        }));
    };

    // --- TRAVEL LOGIC ---
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Open Modal
        setPendingLocation({ x, y });
        setTempLogName('');
        setTempLogThoughts('');
        setTempLogAttachments([]);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setPendingLocation(null);
        setTempLogName('');
        setTempLogThoughts('');
        setTempLogAttachments([]);
        setIsModalOpen(true);
    };

    const confirmAddTravel = async () => {
        if(!tempLogName.trim()) {
            alert("请输入城市/地点名称");
            return;
        }

        setIsLocating(true);
        
        // 1. Use AI to get coordinates
        const coords = await getCityCoordinates(tempLogName);
        
        // 2. Convert to Map Percentages
        let location = { x: 50, y: 50 }; // Default center if failed
        if (coords) {
            location = latLngToMapPercent(coords.lat, coords.lng);
        } else {
            alert("无法自动定位该地点，已放置在地图中心，请稍后手动调整(暂未实现手动调整)");
        }

        const newLog: TravelLog = {
            id: Date.now().toString(),
            locationName: tempLogName,
            x: location.x,
            y: location.y,
            thoughts: tempLogThoughts,
            attachments: tempLogAttachments
        };
        
        setTravels(prev => [...prev, newLog]);
        setIsLocating(false);
        setIsModalOpen(false);
    };

    const cancelAddTravel = () => {
        setIsModalOpen(false);
    };

    const deleteTravel = (id: string) => {
        if(confirm('删除这个旅行记录？')) {
            setTravels(prev => prev.filter(t => t.id !== id));
        }
    };

    const updateTravel = (id: string, field: keyof TravelLog, value: any) => {
        setTravels(prev => prev.map(t => t.id === id ? {...t, [field]: value} : t));
    };

    // Helper for modal upload
    const handleTempUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    const newAtt: Attachment = {
                        id: Date.now().toString() + Math.random(),
                        type: file.type === 'application/pdf' ? 'pdf' : 'image',
                        src: reader.result as string,
                        name: file.name
                    };
                    setTempLogAttachments(prev => [...prev, newAtt]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // Helper for existing travel upload
    const handleTravelUpload = (e: React.ChangeEvent<HTMLInputElement>, logId: string) => {
        if(e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    const newAtt: Attachment = {
                        id: Date.now().toString() + Math.random(),
                        type: file.type === 'application/pdf' ? 'pdf' : 'image',
                        src: reader.result as string,
                        name: file.name
                    };
                    setTravels(prev => prev.map(t => {
                        if(t.id === logId) {
                            return { ...t, attachments: [...t.attachments, newAtt] };
                        }
                        return t;
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    return (
        <PageContainer {...props} viewId="LIFE_PLAN">
            <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen">
                
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl border border-white/40 shadow-sm">人生规划 & 旅行</h1>
                    <div className="flex gap-2 bg-white/40 p-1 rounded-full backdrop-blur-md shadow-inner">
                        <button 
                            onClick={() => setActiveTab('PLANS')}
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'PLANS' ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            规划文档
                        </button>
                        <button 
                            onClick={() => setActiveTab('TRAVEL')}
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'TRAVEL' ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            旅行足迹
                        </button>
                    </div>
                </div>

                {/* --- PLANS TAB --- */}
                {activeTab === 'PLANS' && (
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar List */}
                        <div className="w-full md:w-1/4 space-y-4">
                             <button onClick={addPlan} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold transition active:scale-95">
                                 <Plus className="w-5 h-5"/> 新建规划
                             </button>
                             <div className="space-y-2">
                                {plans.map(plan => (
                                    <div 
                                        key={plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                        className={`p-4 rounded-xl cursor-pointer transition border flex justify-between items-center group ${selectedPlanId === plan.id ? 'bg-white border-orange-300 shadow-md' : 'bg-white/40 border-transparent hover:bg-white/60'}`}
                                    >
                                        <div>
                                            <h3 className="font-bold text-gray-800">{plan.title || '无标题'}</h3>
                                            <p className="text-xs text-gray-500">{plan.date}</p>
                                        </div>
                                        <button onClick={(e) => deletePlan(plan.id, e)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                ))}
                             </div>
                        </div>

                        {/* Editor Area */}
                        <div className="w-full md:w-3/4">
                            {selectedPlanId ? (
                                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl min-h-[600px] flex flex-col border border-white/60">
                                    {(() => {
                                        const plan = plans.find(p => p.id === selectedPlanId);
                                        if(!plan) return null;
                                        return (
                                            <>
                                                {/* Doc Header */}
                                                <div className="p-8 border-b border-gray-100">
                                                    <EditableText 
                                                        value={plan.title} 
                                                        onChange={v => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, title: v} : p))} 
                                                        className="text-4xl font-extrabold text-gray-900 mb-2"
                                                        placeholder="规划标题"
                                                    />
                                                    <EditableText 
                                                        value={plan.date} 
                                                        onChange={v => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, date: v} : p))} 
                                                        className="text-gray-500 font-medium"
                                                    />
                                                </div>

                                                {/* Doc Blocks */}
                                                <div className="p-8 md:px-12 flex-1 space-y-1">
                                                    {plan.blocks.map(block => (
                                                        <PlanBlockItem 
                                                            key={block.id} 
                                                            block={block} 
                                                            updateBlock={(b) => updateBlock(plan.id, b)} 
                                                            deleteBlock={(bid) => deleteBlock(plan.id, bid)}
                                                        />
                                                    ))}
                                                    <div className="h-20" /> {/* Spacer */}
                                                </div>

                                                {/* Sticky Toolbar */}
                                                <div className="sticky bottom-4 mx-auto bg-gray-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex gap-6 items-center justify-center mb-6 border border-white/10 w-fit">
                                                    <button onClick={() => addBlockToPlan(plan.id, 'h1')} title="一级标题" className="hover:text-orange-400 transition transform hover:-translate-y-1"><Heading1 className="w-5 h-5"/></button>
                                                    <button onClick={() => addBlockToPlan(plan.id, 'h2')} title="二级标题" className="hover:text-orange-400 transition transform hover:-translate-y-1"><Heading2 className="w-5 h-5"/></button>
                                                    <button onClick={() => addBlockToPlan(plan.id, 'text')} title="文本" className="hover:text-orange-400 transition transform hover:-translate-y-1"><FileText className="w-5 h-5"/></button>
                                                    <div className="w-px h-5 bg-gray-600"></div>
                                                    <button onClick={() => addBlockToPlan(plan.id, 'todo')} title="待办清单" className="hover:text-orange-400 transition transform hover:-translate-y-1"><CheckSquare className="w-5 h-5"/></button>
                                                    <button onClick={() => addBlockToPlan(plan.id, 'bullet')} title="列表" className="hover:text-orange-400 transition transform hover:-translate-y-1"><List className="w-5 h-5"/></button>
                                                    <button onClick={() => addBlockToPlan(plan.id, 'table')} title="表格" className="hover:text-orange-400 transition transform hover:-translate-y-1"><TableIcon className="w-5 h-5"/></button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-white/40 rounded-2xl border-2 border-dashed border-gray-200">
                                    <p>选择或创建一个规划开始编辑</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TRAVEL MAP TAB --- */}
                {activeTab === 'TRAVEL' && (
                    <div className="space-y-8 animate-fade-in relative">
                        {/* Header Action */}
                        <div className="flex justify-end px-4">
                            <button 
                                onClick={openAddModal}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition active:scale-95 flex items-center gap-2"
                            >
                                <MapIcon className="w-5 h-5" /> 添加新足迹 (自动点亮)
                            </button>
                        </div>

                        {/* Map Container */}
                        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-blue-50 group">
                            {/* High-Res Detailed World Map */}
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" 
                                style={{background: 'url(https://upload.wikimedia.org/wikipedia/commons/7/74/Mercator-projection.jpg) no-repeat center center / cover'}}
                                alt="World Map" 
                                className="w-full h-auto object-cover opacity-90 min-h-[500px]"
                            />
                            
                            {/* Glowing 'Light' Dots */}
                            {travels.map(log => (
                                <div 
                                    key={log.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                                    style={{ left: `${log.x}%`, top: `${log.y}%` }}
                                    title={log.locationName}
                                >
                                    {/* The Glowing Light Orb */}
                                    <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_4px_rgba(250,204,21,0.8)] animate-pulse"></div>
                                    <div className="w-8 h-8 bg-yellow-400/30 rounded-full absolute -top-2.5 -left-2.5 animate-ping"></div>
                                    
                                    {/* Tooltip on Hover */}
                                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">
                                        {log.locationName}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MODAL for New Footprint */}
                        {isModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/50">
                                    <div className="bg-gradient-to-r from-orange-100 to-white p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <MapIcon className="w-5 h-5 text-orange-500"/> 
                                            记录新足迹
                                        </h3>
                                        <button onClick={cancelAddTravel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">城市/地点名称 (输入后将自动定位)</label>
                                            <input 
                                                autoFocus
                                                value={tempLogName}
                                                onChange={e => setTempLogName(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none"
                                                placeholder="例如: 巴黎, 东京, 纽约"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">后记 / 感想</label>
                                            <textarea 
                                                value={tempLogThoughts}
                                                onChange={e => setTempLogThoughts(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none h-24 resize-none"
                                                placeholder="写下这一刻的心情..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-2">附件 (机票/照片)</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {tempLogAttachments.map((att, i) => (
                                                    <div key={i} className="w-16 h-16 bg-gray-100 rounded border relative">
                                                        {att.type === 'image' ? <img src={att.src} className="w-full h-full object-cover rounded"/> : <div className="flex items-center justify-center h-full"><FileText className="w-6 h-6 text-gray-400"/></div>}
                                                        <button onClick={() => setTempLogAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg transition font-medium">
                                                <Upload className="w-4 h-4"/> 上传文件
                                                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleTempUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                                        <button onClick={cancelAddTravel} className="px-4 py-2 text-gray-500 hover:bg-gray-200 rounded-lg transition font-medium" disabled={isLocating}>取消</button>
                                        <button 
                                            onClick={confirmAddTravel} 
                                            disabled={isLocating}
                                            className={`px-6 py-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-lg shadow-md hover:shadow-lg transition transform active:scale-95 font-bold flex items-center gap-2 ${isLocating ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {isLocating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
                                            {isLocating ? '定位中...' : '自动点亮'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Travel Logs Display */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {travels.map(log => (
                                <div key={log.id} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/60 hover:shadow-xl transition relative group">
                                    <button onClick={() => deleteTravel(log.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-5 h-5"/></button>
                                    
                                    <div className="flex items-center gap-2 mb-4 text-orange-600">
                                        <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,1)]"></div>
                                        <EditableText 
                                            value={log.locationName} 
                                            onChange={v => updateTravel(log.id, 'locationName', v)}
                                            className="font-bold text-xl text-gray-800 border-b border-transparent hover:border-orange-200"
                                        />
                                    </div>
                                    
                                    <div className="bg-white/50 p-4 rounded-xl border border-white/40 mb-4 min-h-[100px]">
                                        <EditableText 
                                            value={log.thoughts} 
                                            onChange={v => updateTravel(log.id, 'thoughts', v)}
                                            multiline
                                            className="text-gray-600 leading-relaxed text-sm"
                                            placeholder="写下你的旅行感想..."
                                        />
                                    </div>

                                    {/* Attachments */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {log.attachments.map(att => (
                                            <div key={att.id} className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden relative border group/att">
                                                {att.type === 'image' ? (
                                                    <img src={att.src} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-white"><FileText className="text-red-500 w-6 h-6"/></div>
                                                )}
                                                <button onClick={() => {
                                                    setTravels(prev => prev.map(t => t.id === log.id ? {...t, attachments: t.attachments.filter(a => a.id !== att.id)} : t))
                                                }} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover/att:opacity-100 transition"><X className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>

                                    <label className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 cursor-pointer transition text-sm font-bold">
                                        <Upload className="w-4 h-4"/> 上传机票/照片
                                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleTravelUpload(e, log.id)} />
                                    </label>
                                </div>
                            ))}
                            {travels.length === 0 && (
                                <div className="col-span-full text-center py-10 text-gray-400">
                                    <Globe className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>点击上方按钮，输入城市名称，自动点亮你的第一个目的地！</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PageContainer>
    );
};

const HomeView = ({ 
  profile, setProfile, lifeMoments, setLifeMoments, ...props 
}: {
  profile: Profile, 
  setProfile: React.Dispatch<React.SetStateAction<Profile>>, 
  lifeMoments: GalleryItem[], 
  setLifeMoments: React.Dispatch<React.SetStateAction<GalleryItem[]>>
} & SharedPageProps) => {

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
         const reader = new FileReader();
         reader.onload = () => setProfile(prev => ({...prev, avatar: reader.result as string}));
         reader.readAsDataURL(file);
      }
    };

    const addLifeMoment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
           const reader = new FileReader();
           reader.onload = () => setLifeMoments(prev => [...prev, {id: Date.now().toString(), src: reader.result as string}]);
           reader.readAsDataURL(file);
        }
    };

    const handlePolishBio = async () => {
        const polished = await polishText(profile.aboutMe);
        setProfile(p => ({...p, aboutMe: polished}));
    };

    return (
      <PageContainer {...props} viewId="HOME">
      <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 flex flex-col items-center md:w-1/3 border border-white/60 relative overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
            {/* Decorative Header */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-orange-200/80 to-amber-100/80 -z-0" />
            
            <div className="relative z-10 mt-8 group">
              <div className="w-32 h-32 rounded-full border-4 border-white/80 shadow-lg overflow-hidden bg-gray-200 relative">
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="text-white w-8 h-8 drop-shadow-md" />
                    <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*"/>
                </label>
              </div>
            </div>
            
            <div className="mt-4 text-center w-full space-y-2">
              <EditableText value={profile.name} onChange={v => setProfile(p => ({...p, name: v}))} className="text-2xl font-bold text-center block uppercase tracking-wider text-gray-800 drop-shadow-sm" />
              <EditableText value={profile.major} onChange={v => setProfile(p => ({...p, major: v}))} className="text-gray-600 text-center block font-medium" />
              <div className="flex flex-col gap-2 text-sm text-gray-500 items-center mt-2 w-full px-4">
                 <div className="flex justify-between w-full border-b border-dashed border-gray-200/60 pb-1">
                     <span>学校:</span> 
                     <EditableText value={profile.school} onChange={v => setProfile(p => ({...p, school: v}))} className="font-medium text-gray-700" />
                 </div>
                 <div className="flex justify-between w-full border-b border-dashed border-gray-200/60 pb-1">
                     <span>年纪:</span> 
                     <EditableText value={profile.year} onChange={v => setProfile(p => ({...p, year: v}))} className="font-medium text-gray-700"/>
                 </div>
                 <div className="flex justify-between w-full pb-1">
                     <span>MBTI:</span> 
                     <EditableText value={profile.mbti} onChange={v => setProfile(p => ({...p, mbti: v}))} className="font-bold text-orange-500"/>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-6">
            {/* About Me */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 border border-white/60">
              <div className="flex justify-between items-center mb-4 border-b-2 border-orange-100/50 pb-2">
                  <h2 className="text-xl font-bold text-gray-800">关于我</h2>
                  <button onClick={handlePolishBio} className="text-xs flex items-center gap-1 text-orange-600 bg-white/50 border border-white/60 px-3 py-1.5 rounded-full hover:bg-white shadow-sm transition-all active:scale-95">
                      <Sparkles className="w-3 h-3" /> AI 润色
                  </button>
              </div>
              <EditableText multiline value={profile.aboutMe} onChange={v => setProfile(p => ({...p, aboutMe: v}))} className="text-gray-700 leading-relaxed min-h-[100px]" />
            </div>

            {/* Life Moments - Horizontal Scroll */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 border border-white/60">
              <div className="flex justify-between items-center mb-4 border-b-2 border-orange-100/50 pb-2">
                 <h2 className="text-xl font-bold text-gray-800">生活瞬间</h2>
                 <label className="cursor-pointer p-2 bg-gradient-to-br from-orange-100/50 to-white/50 rounded-full hover:bg-white border border-white/60 shadow-md backdrop-blur-sm text-orange-600 transition-all hover:-translate-y-0.5 active:scale-95">
                    <Plus className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={addLifeMoment} accept="image/*" />
                 </label>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {lifeMoments.map((moment) => (
                    <div key={moment.id} className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 border-white shadow-md transform hover:scale-105 transition">
                        <img src={moment.src} alt="Moment" className="w-full h-full object-cover" />
                    </div>
                ))}
                {lifeMoments.length === 0 && <p className="text-gray-400 italic py-4">添加照片展示你的生活瞬间...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
      </PageContainer>
    );
};

const NotesView = ({ 
  notes, setNotes, activeNoteId, setActiveNoteId, ...props 
}: {
  notes: Note[],
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
  activeNoteId: string | null,
  setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>
} & SharedPageProps) => {

    if (activeNoteId) {
      const note = notes.find(n => n.id === activeNoteId);
      if (!note) return <div>Note not found</div>;
      return (
        <NoteEditor 
          note={note} 
          onUpdate={(updated) => setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))} 
          onBack={() => setActiveNoteId(null)} 
        />
      );
    }

    const addNote = () => {
        const colors = ['bg-teal-700', 'bg-rose-700', 'bg-indigo-700', 'bg-amber-700', 'bg-slate-700', 'bg-sky-700'];
        const newNote: Note = {
            id: Date.now().toString(),
            title: '新科目',
            subtitle: '课程代码',
            color: colors[Math.floor(Math.random() * colors.length)],
            blocks: []
        };
        setNotes(prev => [newNote, ...prev]);
    };

    const updateNoteCover = (id: string, image: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, coverImage: image } : n));
    };

    const updateNoteColor = (id: string, color: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, customColor: color, coverImage: undefined } : n));
    };

    return (
      <PageContainer {...props} viewId="NOTES">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl inline-block shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-white/40">学习笔记</h1>
            <button onClick={addNote} className="bg-gradient-to-br from-orange-400/90 to-orange-600/90 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-full shadow-[0_8px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_20px_rgba(249,115,22,0.4)] flex items-center gap-2 font-bold transition-all transform hover:-translate-y-1 active:scale-95">
                <Plus className="w-5 h-5" /> 添加科目
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {notes.map(note => (
            <div 
              key={note.id} 
              onClick={() => setActiveNoteId(note.id)}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-all cursor-pointer group overflow-hidden border border-white/60 flex flex-col h-[280px] transform hover:-translate-y-2 relative"
            >
              {/* Cover Area */}
              <div 
                className={`h-1/2 relative flex flex-col justify-between transition-colors bg-cover bg-center`}
                style={{ 
                    backgroundImage: note.coverImage ? `url(${note.coverImage})` : undefined,
                    backgroundColor: note.customColor ? note.customColor : undefined 
                }}
              >
                 {/* Fallback Tailwind Color if no custom color/image */}
                 {(!note.coverImage && !note.customColor) && <div className={`absolute inset-0 ${note.color}`}></div>}

                 {/* Decorative Overlay */}
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                 
                 {/* Settings on Hover - 3D Glass Icons */}
                 <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={(e) => e.stopPropagation()}>
                    <label className="text-white bg-black/30 backdrop-blur-md hover:bg-black/50 border border-white/20 rounded-full p-2 transition cursor-pointer shadow-lg active:scale-90" title="上传背景图">
                        <ImagePlus className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if(file) {
                                const reader = new FileReader();
                                reader.onload = () => updateNoteCover(note.id, reader.result as string);
                                reader.readAsDataURL(file);
                            }
                        }}/>
                    </label>
                    <label className="text-white bg-black/30 backdrop-blur-md hover:bg-black/50 border border-white/20 rounded-full p-2 transition cursor-pointer shadow-lg active:scale-90" title="修改颜色">
                        <Palette className="w-4 h-4" />
                        <input type="color" className="hidden" onChange={(e) => updateNoteColor(note.id, e.target.value)} />
                    </label>
                    {note.coverImage && (
                        <button 
                            className="text-white bg-black/30 backdrop-blur-md hover:bg-red-500/80 border border-white/20 rounded-full p-2 transition shadow-lg active:scale-90"
                            title="移除图片"
                            onClick={() => updateNoteCover(note.id, '')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                 </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between relative z-10 bg-white/90">
                 <div onClick={(e) => e.stopPropagation()}>
                    <EditableText value={note.title} onChange={(v) => setNotes(prev => prev.map(n => n.id === note.id ? {...n, title: v} : n))} className="font-bold text-xl text-gray-800 truncate mb-1 block" />
                    <EditableText value={note.subtitle} onChange={(v) => setNotes(prev => prev.map(n => n.id === note.id ? {...n, subtitle: v} : n))} className="text-sm text-gray-500 truncate block" />
                 </div>
                 <div className="flex justify-between items-center text-gray-400 mt-2">
                     <div className="flex gap-2 items-center text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">
                        <BookOpen className="w-3 h-3" />
                        <span>进入笔记</span>
                     </div>
                     <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </PageContainer>
    );
};

const SocialView = ({ 
  profile, setProfile, posts, setPosts, socialCover, setSocialCover, ...props 
}: {
  profile: Profile,
  setProfile: React.Dispatch<React.SetStateAction<Profile>>,
  posts: SocialPost[],
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>,
  socialCover: string,
  setSocialCover: React.Dispatch<React.SetStateAction<string>>
} & SharedPageProps) => {
    
    // Now valid to use Hooks here because SocialView is a component
    const [newPostText, setNewPostText] = useState('');
    const [newPostImages, setNewPostImages] = useState<string[]>([]);
    
    const handlePost = () => {
        if(!newPostText.trim() && newPostImages.length === 0) return;
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const newPost: SocialPost = {
            id: Date.now().toString(),
            userAvatar: profile.avatar,
            userName: profile.name,
            content: newPostText,
            images: newPostImages,
            timestamp: timeString, 
            likes: 0,
            location: '网页端'
        };
        setPosts(prev => [newPost, ...prev]);
        setNewPostText('');
        setNewPostImages([]);
    };

    const handleDeletePost = (id: string) => {
        if (confirm("确定要删除这条朋友圈吗？")) {
            setPosts(prev => prev.filter(p => p.id !== id));
        }
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setSocialCover(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = () => setProfile(prev => ({...prev, avatar: reader.result as string}));
            reader.readAsDataURL(file);
        }
    }

    const handlePostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = () => setNewPostImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    }

    return (
      <PageContainer {...props} viewId="SOCIAL">
      {/* Expanded to wider width for desktop web experience */}
      <div className="max-w-screen-xl mx-auto bg-white min-h-[calc(100vh-80px)] shadow-2xl relative w-full">
        {/* HEADER: Cover + Avatar on Boundary */}
        <div className="relative mb-24"> 
            {/* Cover Image Container */}
            <div className="h-[450px] w-full overflow-hidden relative group bg-gray-200">
                 <img src={socialCover} alt="Cover" className="w-full h-full object-cover" />
                 <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white font-bold backdrop-blur-sm">
                     <div className="bg-black/40 px-6 py-3 rounded-full flex items-center gap-2 border border-white/30 shadow-lg hover:scale-105 transition-transform">
                        <Settings className="w-5 h-5" /> 点击更换封面
                     </div>
                     <input type="file" className="hidden" onChange={handleCoverChange} accept="image/*" />
                 </label>
            </div>
            
            {/* Avatar on Dividing Line */}
            <div className="absolute bottom-0 right-12 transform translate-y-1/2 z-20 flex items-end gap-6">
                <span className="text-white font-bold text-3xl drop-shadow-md mb-8 mr-2 tracking-wide">{profile.name}</span>
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-[4px] border-white bg-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] relative group">
                    <img src={profile.avatar} className="w-full h-full object-cover" alt="Me" />
                    {/* Unified Avatar Edit Tool */}
                    <label className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition text-white">
                        <div className="bg-black/40 p-3 rounded-full border border-white/30 shadow-lg">
                            <Camera className="w-8 h-8"/>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                </div>
            </div>
        </div>
        
        {/* Content Area */}
        <div className="px-8 md:px-16 pb-20 pt-4">
            
            {/* INLINE POST EDITOR (Text Editing Area) */}
            <div className="mb-12 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] animate-fade-in mx-1 hover:shadow-lg transition-shadow">
                 <div className="relative">
                    <textarea 
                        value={newPostText} 
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="这一刻的想法..." 
                        className="w-full bg-transparent border-none outline-none resize-none h-24 text-lg placeholder:text-gray-400"
                    />
                    
                    {/* Image Previews */}
                    {newPostImages.length > 0 && (
                        <div className="grid grid-cols-6 gap-3 mb-4 mt-2">
                             {newPostImages.map((img, idx) => (
                                 <div key={idx} className="relative aspect-square group">
                                     <img src={img} className="w-full h-full object-cover rounded-lg shadow-sm" alt="upload"/>
                                     <button onClick={() => setNewPostImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition"><X className="w-3 h-3"/></button>
                                 </div>
                             ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                         <label className="cursor-pointer text-gray-500 hover:text-orange-500 transition p-2.5 hover:bg-white rounded-full shadow-sm border border-transparent hover:border-gray-200">
                             <ImageIcon className="w-6 h-6" />
                             <input type="file" multiple accept="image/*" className="hidden" onChange={handlePostImageUpload} />
                         </label>
                         <div className="flex items-center gap-4">
                             <span className="text-xs text-gray-400 font-medium">
                                 {(newPostText || newPostImages.length > 0) ? new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                             </span>
                             <button 
                                onClick={handlePost} 
                                disabled={!newPostText.trim() && newPostImages.length === 0}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 ${(!newPostText.trim() && newPostImages.length === 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-[#07c160]/90 to-[#059640]/90 text-white backdrop-blur-md shadow-green-500/30 border border-white/20 hover:-translate-y-0.5'}`}
                             >
                                发表
                             </button>
                         </div>
                    </div>
                 </div>
            </div>

            {/* Feed List */}
            <div className="space-y-12 mt-8">
                {posts.map(post => {
                    const isCurrentUser = post.userName === profile.name;
                    return (
                    <div key={post.id} className="flex gap-6 border-b border-gray-100 pb-10 last:border-0 animate-fade-in">
                        {/* Avatar Left */}
                        <img 
                            src={isCurrentUser ? profile.avatar : post.userAvatar} 
                            className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 object-cover cursor-pointer hover:opacity-90 shadow-sm border border-gray-100" 
                            alt={post.userName} 
                        />
                        
                        {/* Right Content */}
                        <div className="flex-1 w-full">
                            <h4 className="font-bold text-[#576b95] mb-2 text-[20px] leading-tight cursor-pointer hover:underline">{post.userName}</h4>
                            
                            {/* Text Content */}
                            {post.content && <p className="text-[#191919] mb-4 leading-relaxed text-[17px] whitespace-pre-wrap break-words">{post.content}</p>}
                            
                            {/* Smart Image Grid Logic - OPTIMIZED FOR WEB HORIZONTAL LAYOUT */}
                            {post.images.length > 0 && (
                                <div className={`grid gap-2 mb-4 
                                    ${post.images.length === 1 ? 'grid-cols-1 md:max-w-[600px]' : 
                                      post.images.length === 4 ? 'grid-cols-2 md:max-w-[500px]' : 
                                      'grid-cols-3 md:max-w-[700px]'}`}
                                >
                                    {post.images.map((img, idx) => (
                                        <div key={idx} className={`relative overflow-hidden ${post.images.length === 1 ? 'aspect-auto' : 'aspect-square'}`}>
                                            <img 
                                                src={img} 
                                                alt="Post content" 
                                                className={`w-full h-full object-cover bg-gray-100 cursor-zoom-in hover:brightness-95 transition ${post.images.length === 1 ? 'max-h-[500px] w-auto' : ''}`} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Location */}
                            {post.location && (
                                <div className="text-[14px] text-[#576b95] mb-3 cursor-pointer hover:underline">{post.location}</div>
                            )}

                            {/* Footer Line */}
                            <div className="flex justify-between items-center h-6 relative mt-4">
                                <div className="flex items-center gap-6 text-sm text-gray-400">
                                    <span>{post.timestamp}</span>
                                    {/* Delete Button - Visible for ALL posts */}
                                    <button 
                                        onClick={() => handleDeletePost(post.id)}
                                        className="text-[#576b95] hover:underline hover:bg-blue-50 px-2 rounded transition-colors"
                                    >
                                        删除
                                    </button>
                                </div>
                                {/* Comment/Like Icon */}
                                <div className="bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5 cursor-pointer transition text-[#576b95] shadow-sm">
                                    <MoreHorizontal className="w-6 h-5" />
                                </div>
                            </div>

                            {/* Likes/Comments Bubble */}
                            {(post.likes > 0) && (
                                <div className="mt-4 bg-[#f7f7f7] rounded-[4px] py-2 px-3 relative triangle-top">
                                    <div className="flex items-center text-[14px] text-[#576b95] font-medium">
                                        <Heart className="w-4 h-4 mr-1.5 text-[#576b95]" />
                                        <span>{post.userName}, Hexin, 等{post.likes}人觉得很赞</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>
      </PageContainer>
    );
};

const GalleryView = ({ 
  gallery, setGallery, ...props 
}: {
  gallery: GalleryItem[],
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>
} & SharedPageProps) => {

      const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = () => setGallery(prev => [{id: Date.now().toString(), src: reader.result as string}, ...prev]);
            reader.readAsDataURL(file);
        }
      };
      
      const deletePhoto = (id: string) => {
          if(confirm('确定要删除这张照片吗？')) {
              setGallery(prev => prev.filter(g => g.id !== id));
          }
      };

      return (
        <PageContainer {...props} viewId="GALLERY">
        <div className="p-4 h-full flex flex-col bg-white/50 backdrop-blur-sm min-h-[calc(100vh-80px)]">
             <div className="flex justify-between items-center mb-6 px-2">
                <h1 className="text-2xl font-bold text-gray-800 bg-white/60 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm border border-white/40">所有照片 <span className="text-lg text-gray-400 font-normal">({gallery.length})</span></h1>
                <div className="flex gap-4 font-medium">
                    <label className="cursor-pointer bg-white/60 hover:bg-white text-orange-600 border border-white/60 px-5 py-2 rounded-full transition shadow-[0_4px_10px_rgba(0,0,0,0.05)] backdrop-blur-md active:scale-95 text-sm font-bold">
                        选择
                    </label>
                    <label className="cursor-pointer bg-gradient-to-br from-orange-400/90 to-orange-600/90 text-white border border-white/20 px-6 py-2 rounded-full flex items-center gap-2 transition shadow-[0_8px_16px_rgba(249,115,22,0.3)] backdrop-blur-md active:scale-95 hover:-translate-y-0.5 text-sm font-bold">
                        <Plus className="w-4 h-4"/> 添加
                        <input type="file" className="hidden" onChange={addPhoto} accept="image/*" />
                    </label>
                </div>
             </div>
             <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 auto-rows-[120px] md:auto-rows-[180px] pb-20">
                {gallery.map(item => (
                    <div key={item.id} className="relative group w-full h-full bg-gray-100 overflow-hidden cursor-pointer rounded-lg shadow-sm hover:shadow-xl hover:z-10 transition-all duration-300 hover:scale-105 border border-white/50">
                        <img src={item.src} alt="" className="w-full h-full object-cover transition-transform duration-500" />
                        <button 
                            onClick={() => deletePhoto(item.id)}
                            className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110 shadow-md border border-white/20"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
             </div>
        </div>
        </PageContainer>
      );
};

const ResumeView = ({ 
  resume, setResume, ...props 
}: {
  resume: ResumeSection[],
  setResume: React.Dispatch<React.SetStateAction<ResumeSection[]>>
} & SharedPageProps) => {

      const addSectionItem = (sectionId: string) => {
          setResume(prev => prev.map(sec => {
              if (sec.id === sectionId) {
                  return {
                      ...sec,
                      items: [...sec.items, {
                          id: Date.now().toString(),
                          title: '新项目',
                          subtitle: '描述/角色',
                          date: '2024 - 至今',
                          description: '在这里描述你的经历...',
                          attachments: []
                      }]
                  }
              }
              return sec;
          }));
      };

      const deleteItem = (sectionId: string, itemId: string) => {
        if(confirm("确定要删除这个项目吗？")) {
             setResume(prev => prev.map(sec => {
                if(sec.id === sectionId) {
                    return { ...sec, items: sec.items.filter(i => i.id !== itemId) };
                }
                return sec;
             }));
        }
      };

      const updateItem = (sectionId: string, itemId: string, field: keyof any, value: any) => {
        setResume(prev => prev.map(sec => {
            if(sec.id === sectionId) {
                return {
                    ...sec,
                    items: sec.items.map(item => item.id === itemId ? {...item, [field]: value} : item)
                };
            }
            return sec;
        }));
      };

      const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionId: string, itemId: string) => {
          if(e.target.files) {
              Array.from(e.target.files).forEach(file => {
                  const reader = new FileReader();
                  reader.onload = () => {
                      const newAttachment: Attachment = {
                          id: Date.now().toString() + Math.random(),
                          type: file.type === 'application/pdf' ? 'pdf' : 'image',
                          src: reader.result as string,
                          name: file.name
                      };
                      
                      setResume(prev => prev.map(sec => {
                          if (sec.id === sectionId) {
                              return {
                                  ...sec,
                                  items: sec.items.map(item => {
                                      if(item.id === itemId) {
                                          return { ...item, attachments: [...item.attachments, newAttachment] };
                                      }
                                      return item;
                                  })
                              }
                          }
                          return sec;
                      }));
                  };
                  reader.readAsDataURL(file);
              });
          }
      };

      const deleteAttachment = (sectionId: string, itemId: string, attachId: string) => {
          setResume(prev => prev.map(sec => {
            if (sec.id === sectionId) {
                return {
                    ...sec,
                    items: sec.items.map(item => {
                        if(item.id === itemId) {
                            return { ...item, attachments: item.attachments.filter(a => a.id !== attachId) };
                        }
                        return item;
                    })
                }
            }
            return sec;
          }));
      };

      const updateAttachmentName = (sectionId: string, itemId: string, attachId: string, newName: string) => {
         setResume(prev => prev.map(sec => {
            if (sec.id === sectionId) {
                return {
                    ...sec,
                    items: sec.items.map(item => {
                        if(item.id === itemId) {
                            return { 
                                ...item, 
                                attachments: item.attachments.map(a => a.id === attachId ? {...a, name: newName} : a) 
                            };
                        }
                        return item;
                    })
                }
            }
            return sec;
         }));
      };

      return (
        <PageContainer {...props} viewId="RESUME">
        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight bg-white/60 backdrop-blur-md inline-block px-8 py-3 rounded-2xl shadow-lg border border-white/40">成长历程</h1>
                <p className="text-gray-600 bg-white/40 backdrop-blur-sm inline-block px-4 py-1 rounded-lg mt-2">记录我的每一步成长与收获</p>
            </div>
            
            {resume.map((section, index) => (
                <div key={section.id} className="mb-12 relative pl-8 border-l-2 border-orange-200/60">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-4 border-white shadow-md ring-1 ring-orange-100"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-lg px-3 py-1 shadow-sm border border-white/40">
                             {section.title}
                        </h2>
                        <button onClick={() => addSectionItem(section.id)} className="p-2 rounded-full hover:bg-white text-orange-600 transition bg-white/50 backdrop-blur-md border border-white/40 shadow-sm active:scale-95 hover:shadow-md">
                            <Plus className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="space-y-6">
                        {section.items.length === 0 && <p className="text-gray-400 italic text-sm border-2 border-dashed border-gray-100 p-6 rounded-2xl text-center bg-white/30 backdrop-blur-sm">点击右上角 + 添加{section.title}</p>}
                        {section.items.map(item => (
                            <div key={item.id} className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-white/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all transform hover:-translate-x-1 hover:-translate-y-0.5 relative group">
                                {/* Delete Item Button */}
                                <button 
                                    onClick={() => deleteItem(section.id, item.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 z-30"
                                    title="删除此项"
                                >
                                    <Trash2 className="w-5 h-5"/>
                                </button>

                                <div className="flex flex-col md:flex-row justify-between md:items-start mb-2 gap-2 pr-10">
                                    <EditableText 
                                        value={item.title} 
                                        onChange={(v) => updateItem(section.id, item.id, 'title', v)} 
                                        className="font-bold text-lg text-gray-900 flex-1"
                                    />
                                    <EditableText 
                                        value={item.date} 
                                        onChange={(v) => updateItem(section.id, item.id, 'date', v)} 
                                        className="text-xs text-orange-700 font-bold bg-orange-100/60 px-3 py-1 rounded-full w-fit whitespace-nowrap shadow-sm border border-orange-100"
                                    />
                                </div>
                                <EditableText 
                                    value={item.subtitle} 
                                    onChange={(v) => updateItem(section.id, item.id, 'subtitle', v)} 
                                    className="text-gray-500 font-medium text-sm mb-3 block"
                                />
                                <div className="bg-white/50 p-4 rounded-xl border border-white/40 mb-4">
                                    <EditableText 
                                        value={item.description} 
                                        onChange={(v) => updateItem(section.id, item.id, 'description', v)} 
                                        multiline
                                        className="text-gray-600 text-sm leading-relaxed"
                                    />
                                </div>

                                {/* Attachments Area */}
                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <div className="flex flex-wrap gap-3 mb-3">
                                        {item.attachments.map(att => (
                                            <div key={att.id} className="relative group/att w-32 md:w-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex flex-col">
                                                {/* Preview Area */}
                                                <div className="h-24 w-full bg-gray-200 overflow-hidden relative">
                                                    {att.type === 'image' ? (
                                                        <img src={att.src} className="w-full h-full object-cover" alt="attachment" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-1 bg-white p-2">
                                                            <FileText className="w-8 h-8 text-red-500"/>
                                                            <span className="text-[9px] uppercase font-bold text-red-500">PDF Document</span>
                                                        </div>
                                                    )}
                                                    {/* View Link Overlay */}
                                                    <a href={att.src} download={att.name} className="absolute inset-0 bg-black/0 hover:bg-black/10 transition z-10 flex items-center justify-center opacity-0 hover:opacity-100">
                                                        <ExternalLink className="text-white drop-shadow-md w-6 h-6"/>
                                                    </a>
                                                </div>

                                                {/* Editable Name Area */}
                                                <div className="p-2 bg-white flex-1 flex items-center">
                                                    <EditableText 
                                                        value={att.name} 
                                                        onChange={(v) => updateAttachmentName(section.id, item.id, att.id, v)}
                                                        className="text-[10px] font-medium text-gray-700 w-full truncate text-center"
                                                        placeholder="输入文件名..."
                                                    />
                                                </div>

                                                {/* Delete Attachment Button */}
                                                <button 
                                                    onClick={() => deleteAttachment(section.id, item.id, att.id)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/att:opacity-100 z-20 hover:scale-110 transition shadow-sm"
                                                    title="删除附件"
                                                >
                                                    <X className="w-3 h-3"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-200 transition">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        <span>添加附件 (图片/PDF)</span>
                                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, section.id, item.id)} />
                                    </label>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        </PageContainer>
      );
};

const HobbiesView = ({ 
  hobbies, setHobbies, ...props 
}: {
  hobbies: Hobby[],
  setHobbies: React.Dispatch<React.SetStateAction<Hobby[]>>
} & SharedPageProps) => {

      const addHobby = () => {
          setHobbies(prev => [...prev, {id: Date.now().toString(), name: '新兴趣', content: '描述这个爱好...', images: []}]);
      };

      const deleteHobby = (id: string) => {
          if(confirm("确定删除这个兴趣栏吗？")) {
              setHobbies(prev => prev.filter(h => h.id !== id));
          }
      };

      return (
          <PageContainer {...props} viewId="HOBBIES">
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
               <div className="flex justify-between items-center mb-8">
                   <h1 className="text-3xl font-bold text-gray-800 bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl inline-block shadow-sm border border-white/40">兴趣爱好</h1>
                   <button onClick={addHobby} className="bg-gradient-to-br from-orange-400/90 to-orange-600/90 backdrop-blur-md text-white px-6 py-2.5 rounded-full shadow-[0_8px_16px_rgba(249,115,22,0.3)] border border-white/20 flex items-center gap-2 font-bold transition transform hover:-translate-y-1 active:scale-95 hover:shadow-orange-500/40">
                       <Plus className="w-5 h-5" /> 添加兴趣栏
                   </button>
               </div>
               
               <div className="space-y-8 pb-20">
                   {hobbies.map(hobby => (
                       <div key={hobby.id} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-6 md:p-8 border border-white/60 relative group animate-fade-in hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-shadow duration-300">
                           {/* Header of the Hobby Card */}
                           <div className="flex justify-between items-start mb-6 border-b border-gray-200/50 pb-4">
                               <div className="flex items-center gap-2">
                                    <span className="text-orange-500 text-2xl font-black drop-shadow-sm">#</span>
                                    <EditableText 
                                        value={hobby.name} 
                                        onChange={(v) => setHobbies(prev => prev.map(h => h.id === hobby.id ? {...h, name: v} : h))}
                                        className="text-2xl font-black text-gray-800 uppercase tracking-tighter"
                                        placeholder="输入兴趣名称"
                                    />
                               </div>
                               <button 
                                    onClick={() => deleteHobby(hobby.id)}
                                    className="text-gray-400 hover:text-red-500 p-2.5 rounded-full hover:bg-red-50 transition-all active:scale-90"
                                    title="删除此兴趣栏"
                               >
                                   <Trash2 className="w-5 h-5"/>
                                </button>
                           </div>
                           
                           {/* Editable Description */}
                           <div className="mb-8">
                                <EditableText 
                                    multiline 
                                    value={hobby.content} 
                                    onChange={(v) => setHobbies(prev => prev.map(h => h.id === hobby.id ? {...h, content: v} : h))}
                                    className="text-lg text-gray-700 leading-loose w-full p-4 hover:bg-white/50 rounded-xl transition border border-transparent hover:border-white/40" 
                                    placeholder="在这里描述你对这个兴趣的热爱..."
                                />
                           </div>
                           
                           {/* Media Grid */}
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                               {hobby.images.map((img, idx) => (
                                   <div key={idx} className="relative group/img rounded-2xl overflow-hidden shadow-lg aspect-square bg-gray-100 border border-white/50">
                                      {img.startsWith('data:video') ? (
                                          <video src={img} controls className="w-full h-full object-cover" />
                                      ) : (
                                          <img src={img} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" alt="" />
                                      )}
                                      <button 
                                        onClick={() => setHobbies(prev => prev.map(h => h.id === hobby.id ? {...h, images: h.images.filter((_, i) => i !== idx)} : h))}
                                        className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white rounded-full p-1.5 opacity-0 group-hover/img:opacity-100 transition hover:bg-red-500 hover:scale-110 border border-white/20 shadow-md"
                                      >
                                          <X className="w-4 h-4" />
                                      </button>
                                   </div>
                               ))}
                               
                               {/* Upload Button */}
                               <label className="bg-white/40 border-2 border-dashed border-gray-300/60 rounded-2xl flex flex-col items-center justify-center h-full min-h-[150px] cursor-pointer hover:bg-white/60 hover:border-orange-300 transition text-gray-400 hover:text-orange-500 aspect-square group/upload backdrop-blur-sm shadow-sm hover:shadow-md">
                                   <div className="p-3 bg-white rounded-full shadow-md group-hover/upload:shadow-lg transition mb-2 group-hover/upload:-translate-y-1 duration-300">
                                      <Upload className="w-6 h-6"/>
                                   </div>
                                   <span className="font-medium text-sm text-center px-2">上传照片/视频</span>
                                   <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={(e) => {
                                       const files = Array.from(e.target.files || []);
                                       files.forEach(f => {
                                           const r = new FileReader();
                                           r.onload = () => setHobbies(prev => prev.map(h => h.id === hobby.id ? {...h, images: [...h.images, r.result as string]} : h));
                                           r.readAsDataURL(f);
                                       });
                                   }}/>
                               </label>
                           </div>
                       </div>
                   ))}
                   
                   {hobbies.length === 0 && (
                       <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white/30 backdrop-blur-sm">
                           <p>还没有添加任何兴趣爱好，点击上方按钮开始记录吧！</p>
                       </div>
                   )}
               </div>
          </div>
          </PageContainer>
      );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  
  // Data States
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  const [gallery, setGallery] = useState<GalleryItem[]>([
    {id: '1', src: 'https://picsum.photos/300/400?random=20'},
    {id: '2', src: 'https://picsum.photos/300/300?random=21'},
    {id: '3', src: 'https://picsum.photos/400/300?random=22'},
  ]);
  const [hobbies, setHobbies] = useState<Hobby[]>([
    { id: '1', name: '摄影', content: '捕捉生活中的美好瞬间。', images: [] },
    { id: '2', name: '编程', content: '用代码构建有趣的数字世界。', images: [] }
  ]);
  const [resume, setResume] = useState<ResumeSection[]>(INITIAL_RESUME);
  const [lifeMoments, setLifeMoments] = useState<GalleryItem[]>([
      {id: 'lm1', src: 'https://picsum.photos/150/150?random=50'}
  ]);
  
  // New State for Life Plans & Travel
  const [plans, setPlans] = useState<LifePlan[]>(INITIAL_PLANS);
  const [travels, setTravels] = useState<TravelLog[]>(INITIAL_TRAVELS);

  // Per-Page Backgrounds & Social Cover
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
  const [socialCover, setSocialCover] = useState('https://picsum.photos/1920/1080?grayscale');

  // Helper to switch view
  const navigate = (v: ViewState) => {
    setView(v);
    setActiveNoteId(null);
    window.scrollTo(0, 0);
  };

  const commonProps = {
      backgrounds,
      setBackgrounds,
      navigate
  };

  // --- MAIN RENDER ---
  return (
    <div className="flex flex-col h-screen font-sans text-slate-800 overflow-hidden">
      
      {/* Top Navigation (Sticky) */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative">
        <div className="flex justify-between items-center px-4 py-0 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
           <div className="flex gap-4 md:gap-8 mx-auto w-full md:w-auto justify-between md:justify-center min-w-max p-2">
                <NavButton active={view === 'HOME'} onClick={() => navigate('HOME')} label="首页" icon={Home} />
                <NavButton active={view === 'NOTES'} onClick={() => navigate('NOTES')} label="学习笔记" icon={BookOpen} />
                <NavButton active={view === 'HOBBIES'} onClick={() => navigate('HOBBIES')} label="兴趣爱好" icon={Heart} />
                <NavButton active={view === 'SOCIAL'} onClick={() => navigate('SOCIAL')} label="我的朋友圈" icon={MessageCircle} />
                <NavButton active={view === 'GALLERY'} onClick={() => navigate('GALLERY')} label="我的相册" icon={ImageIcon} />
                <NavButton active={view === 'RESUME'} onClick={() => navigate('RESUME')} label="成长历程" icon={TrendingUp} />
                <NavButton active={view === 'LIFE_PLAN'} onClick={() => navigate('LIFE_PLAN')} label="人生规划" icon={MapIcon} />
           </div>
        </div>
      </nav>
      
      {/* Dynamic Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth relative z-0">
        {view === 'HOME' && 
            <HomeView {...commonProps} profile={profile} setProfile={setProfile} lifeMoments={lifeMoments} setLifeMoments={setLifeMoments} />
        }
        {view === 'NOTES' && 
            <NotesView {...commonProps} notes={notes} setNotes={setNotes} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} />
        }
        {view === 'SOCIAL' && 
            <SocialView {...commonProps} profile={profile} setProfile={setProfile} posts={posts} setPosts={setPosts} socialCover={socialCover} setSocialCover={setSocialCover} />
        }
        {view === 'GALLERY' && 
            <GalleryView {...commonProps} gallery={gallery} setGallery={setGallery} />
        }
        {view === 'RESUME' && 
            <ResumeView {...commonProps} resume={resume} setResume={setResume} />
        }
        {view === 'HOBBIES' && 
            <HobbiesView {...commonProps} hobbies={hobbies} setHobbies={setHobbies} />
        }
        {view === 'LIFE_PLAN' && 
            <LifePlanView {...commonProps} plans={plans} setPlans={setPlans} travels={travels} setTravels={setTravels} />
        }
      </main>

    </div>
  );
}

// Helper Component for Top Nav - Handwritten Style look
const NavButton = ({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: React.ElementType }) => (
  <button 
    onClick={onClick}
    className={`
        px-3 py-2 md:px-5 md:py-3 text-sm md:text-base font-bold transition-all duration-300 relative group
        ${active ? 'text-orange-600 bg-orange-50/50 rounded-xl' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/50 rounded-xl'}
    `}
  >
    <div className="flex flex-col items-center gap-1.5">
        <Icon size={20} className={`transition-transform duration-300 drop-shadow-sm ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="relative z-10 font-sans tracking-wide text-xs md:text-sm">{label}</span>
    </div>
    {active && (
        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-orange-400 rounded-full opacity-80 shadow-sm"></span>
    )}
  </button>
);