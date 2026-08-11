import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';
import './styles.css';

type Module = 'explore' | 'carry' | 'borrow' | 'challenge';
type Strategy = '拆成五和剩下' | '凑十' | '对半分' | '十位与个位' | '单位转换' | '数字关系理解不足';

type LearningRecord = {
  attempts: number;
  correct: number;
  strategies: Strategy[];
};

// MVP stores only lightweight learning signals locally; no backend or login is needed.
const STORAGE_KEY = 'number-garden-record-v1';
const initialRecord: LearningRecord = { attempts: 0, correct: 0, strategies: [] };

function readRecord(): LearningRecord {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialRecord, ...JSON.parse(stored) } : initialRecord;
  } catch {
    return initialRecord;
  }
}

function writeRecord(record: LearningRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function addStrategy(record: LearningRecord, strategy: Strategy, isCorrect = true): LearningRecord {
  const next = {
    attempts: record.attempts + 1,
    correct: record.correct + (isCorrect ? 1 : 0),
    strategies: Array.from(new Set([...record.strategies, strategy])),
  };
  writeRecord(next);
  return next;
}

// Build a small relationship tree instead of a worksheet-style problem list.
const splitNumber = (value: number) => {
  const safe = Math.max(1, Math.min(99, Math.floor(value || 1)));
  const pairs = new Set<string>();
  const addPair = (left: number, right: number) => {
    if (left >= 0 && right >= 0) pairs.add(`${left} + ${right}`);
  };
  addPair(Math.min(5, safe), safe - Math.min(5, safe));
  addPair(Math.ceil(safe / 2), Math.floor(safe / 2));
  addPair(Math.max(0, safe - 2), Math.min(2, safe));
  if (safe < 20) pairs.add(`${safe + 2} - 2`);
  if (safe <= 10) pairs.add(`10 - ${10 - safe}`);
  return Array.from(pairs).slice(0, 5);
};

function Seed({ children, onClick, active = false }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04, rotate: active ? 0 : -1 }}
      whileTap={{ scale: 0.96 }}
      className={`seed ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function LearningPanel({ record }: { record: LearningRecord }) {
  const accuracy = record.attempts ? Math.round((record.correct / record.attempts) * 100) : 0;
  return (
    <aside className="record card">
      <h3>我的探索记录</h3>
      <p><strong>{record.attempts}</strong> 次探索 · 正确率 <strong>{accuracy}%</strong></p>
      <div className="strategy-list">
        {record.strategies.length ? record.strategies.map((item) => <span key={item}>{item}</span>) : <span>先种下第一颗数字种子吧</span>}
      </div>
    </aside>
  );
}

function NumberExplore({ onStrategy }: { onStrategy: (s: Strategy) => void }) {
  const [value, setValue] = useState(8);
  const [selected, setSelected] = useState('5 + 3');
  const relations = useMemo(() => splitNumber(value), [value]);
  return (
    <section className="card module-card">
      <h2>数字探索</h2>
      <p className="hint">输入一个数字，看看它能长出哪些“关系枝叶”。</p>
      <input className="number-input" type="number" min="1" max="99" value={value} onChange={(e) => setValue(Number(e.target.value))} />
      <div className="tree">
        <motion.div className="trunk" layout>{value}</motion.div>
        <div className="branches">
          {relations.map((relation) => (
            <Seed key={relation} active={selected === relation} onClick={() => { setSelected(relation); onStrategy(relation.includes('10') ? '凑十' : '拆成五和剩下'); }}>
              {relation}
            </Seed>
          ))}
        </div>
      </div>
      <p className="explain">{selected} 和 {value} 有关系，因为它们描述的是同一朵数字花：只是从“合起来”“拆开”或“补到十”的不同角度观察。</p>
    </section>
  );
}

// Reusable base-ten blocks make carrying and borrowing visible as unit conversion.
function Blocks({ tens, ones, color }: { tens: number; ones: number; color: string }) {
  return <div className="blocks">{Array.from({ length: tens }).map((_, i) => <div className="ten" style={{ background: color }} key={`t${i}`}>十</div>)}{Array.from({ length: ones }).map((_, i) => <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="one" key={`o${i}`} />)}</div>;
}

function CarryLab({ onStrategy }: { onStrategy: (s: Strategy) => void }) {
  return <section className="card module-card"><h2>进位实验室</h2><p className="hint">27 + 18：进位不是背规则，而是把 10 个一换成 1 个十。</p><div className="lab-grid"><div><h3>27</h3><Blocks tens={2} ones={7} color="#81c784" /></div><div><h3>18</h3><Blocks tens={1} ones={8} color="#64b5f6" /></div></div><motion.div className="conversion" onViewportEnter={() => onStrategy('单位转换')}><span>7个一 + 8个一 = 15个一</span><strong>10个一 ⇢ 1个十</strong><span>剩下 5 个一，所以是 4个十 + 5个一</span></motion.div><div className="result"><Blocks tens={4} ones={5} color="#ffb74d" /><b>结果：45</b></div></section>;
}

function BorrowLab({ onStrategy }: { onStrategy: (s: Strategy) => void }) {
  return <section className="card module-card"><h2>退位实验室</h2><p className="hint">42 - 18：退位不是“借东西”，而是把 1 个十转换成 10 个一。</p><div className="lab-grid"><div><h3>原来：4个十 2个一</h3><Blocks tens={4} ones={2} color="#ba68c8" /></div><div><h3>转换后：3个十 12个一</h3><Blocks tens={3} ones={12} color="#9575cd" /></div></div><motion.div className="conversion" onViewportEnter={() => onStrategy('单位转换')}><span>2个一不够减8个一</span><strong>1个十 ⇢ 10个一</strong><span>12个一 - 8个一 = 4个一；3个十 - 1个十 = 2个十</span></motion.div><div className="result"><Blocks tens={2} ones={4} color="#4db6ac" /><b>结果：24</b></div></section>;
}

const challengeOptions = ['10 + 5', '8 + 7', '20 - 5', '9 + 9'];
function Challenge({ onAnswer }: { onAnswer: (correct: boolean) => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const good = new Set(['10 + 5', '8 + 7', '20 - 5']);
  return <section className="card module-card"><h2>今日挑战</h2><p className="hint">15 可以怎么组成？选出你发现的关系。可能不止一个答案。</p><div className="choice-grid">{challengeOptions.map((option) => <Seed key={option} active={chosen.includes(option)} onClick={() => { setChosen((old) => old.includes(option) ? old.filter((x) => x !== option) : [...old, option]); onAnswer(good.has(option)); }}>{option}</Seed>)}</div><p className="explain">{chosen.length ? '观察：同一个数字可以由加法、减法、凑十等多条小路到达。' : '先试着选一片叶子，不要着急判断对错。'}</p></section>;
}

function App() {
  const [module, setModule] = useState<Module>('explore');
  const [record, setRecord] = useState(readRecord);
  const note = (strategy: Strategy, correct = true) => setRecord((old) => addStrategy(old, strategy, correct));
  return <main><header className="hero"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><h1>Number Garden 🌱</h1><p>发现数字之间的关系。</p></motion.div></header><nav className="entrances">{[['explore','数字探索'],['carry','进位实验室'],['challenge','今日挑战'],['borrow','退位实验室']].map(([key, label]) => <button className={module === key ? 'selected' : ''} onClick={() => setModule(key as Module)} key={key}>{label}</button>)}</nav><div className="layout"><div>{module === 'explore' && <NumberExplore onStrategy={note} />}{module === 'carry' && <CarryLab onStrategy={note} />}{module === 'borrow' && <BorrowLab onStrategy={note} />}{module === 'challenge' && <Challenge onAnswer={(ok) => note(ok ? '十位与个位' : '数字关系理解不足' as Strategy, ok)} />}</div><LearningPanel record={record} /></div></main>;
}

createRoot(document.getElementById('root')!).render(<App />);
