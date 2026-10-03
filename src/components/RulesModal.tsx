import React, { useState } from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'room' | 'rules' | 'hands'>('room');

  if (!isOpen) return null;

  const handRanks = [
    {
      name: '1. รอยัลสเตรทฟลัช (Royal Flush)',
      desc: 'ไพ่ดอกเดียวกัน 10, J, Q, K, A เป็นชุดไพ่ที่ใหญ่ที่สุดในเกม',
      example: 'A♠ K♠ Q♠ J♠ 10♠',
      rare: 'สูงสุด ไม่มีใครเอาชนะได้',
    },
    {
      name: '2. สเตรทฟลัช (Straight Flush)',
      desc: 'ไพ่ 5 ใบเรียงลำดับกันและเป็นดอกเดียวกันทั้งหมด',
      example: '9♥ 8♥ 7♥ 6♥ 5♥',
      rare: 'เทียบความสูงของไพ่ใบที่มากที่สุด',
    },
    {
      name: '3. โฟร์การ์ด (Four of a Kind)',
      desc: 'ไพ่แต้มเดียวกัน 4 ใบในมือ + ไพ่คิกเกอร์ 1 ใบ',
      example: 'K♦ K♣ K♠ K♥ 4♠',
      rare: 'เทียบแต้มของตองสี่',
    },
    {
      name: '4. ฟูลเฮ้าส์ (Full House)',
      desc: 'ตอง 3 ใบ รวมกับคู่ 2 ใบ',
      example: 'J♠ J♥ J♦ 8♣ 8♦',
      rare: 'เทียบแต้มของตอง 3 ใบก่อน',
    },
    {
      name: '5. ฟลัช / สี (Flush)',
      desc: 'ไพ่ดอกเดียวกัน 5 ใบโดยไม่ต้องเรียงลำดับแต้ม',
      example: 'A♣ J♣ 8♣ 6♣ 2♣',
      rare: 'เทียบไพ่ใบแต้มสูงสุดในชุดสี',
    },
    {
      name: '6. สเตรท / เรียง (Straight)',
      desc: 'ไพ่แต้มเรียงกัน 5 ใบ ดอกใดก็ได้ (A นับเป็นสูง 10-J-Q-K-A หรือต่ำ A-2-3-4-5 ก็ได้)',
      example: '10♦ 9♠ 8♥ 7♣ 6♦',
      rare: 'เทียบแต้มใบที่สูงที่สุด',
    },
    {
      name: '7. ตอง (Three of a Kind)',
      desc: 'ไพ่แต้มเดียวกัน 3 ใบ + ไพ่อื่น 2 ใบ',
      example: '7♠ 7♥ 7♦ K♣ 2♥',
      rare: 'เทียบแต้มของตอง',
    },
    {
      name: '8. สองคู่ (Two Pair)',
      desc: 'มีไพ่คู่ 2 คู่ที่แต้มต่างกัน + คิกเกอร์ 1 ใบ',
      example: 'Q♠ Q♦ 9♣ 9♥ A♠',
      rare: 'เทียบคู่ที่สูงกว่าก่อน',
    },
    {
      name: '9. หนึ่งคู่ (One Pair)',
      desc: 'มีไพ่แต้มเดียวกัน 1 คู่ + ไพ่คิกเกอร์ 3 ใบ',
      example: '10♥ 10♦ A♠ 8♣ 4♥',
      rare: 'เทียบแต้มคู่และคิกเกอร์',
    },
    {
      name: '10. ไพ่สูง (High Card)',
      desc: 'ไม่มีคู่ ไม่เรียง ไม่ใช่สี วัดกันที่ไพ่ใบแต้มสูงสุดในมือ (A สูงสุด)',
      example: 'A♠ K♦ 9♣ 5♥ 2♦',
      rare: 'เทียบแต้มทีละใบจากมากไปน้อย',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              คู่มือวิธีเล่น & กติกาโป๊กเกอร์ (Texas Hold'em)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('room')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'room'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🌐 วิธีสร้าง & จอยห้อง
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ♠ กติกาและรอบการเล่น
          </button>
          <button
            onClick={() => setActiveTab('hands')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'hands'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 ลำดับคะแนนไพ่ (10 อันดับ)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {activeTab === 'room' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col gap-1.5">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <span>🚀</span> เล่นออนไลน์ได้ทันทีผ่าน PeerJS P2P
                </h4>
                <p className="text-slate-300">
                  ระบบเชื่อมต่อตรงระหว่างเครื่องผู้เล่น (Peer-to-Peer) ไม่ต้องสมัครสมาชิก ไม่ต้องจำรหัสผ่าน สามารถเล่นบนคอมพิวเตอร์ แท็บเล็ต หรือมือถือได้พร้อมกัน 2-6 คน
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <strong className="text-white">สร้างห้อง (Create Room):</strong>
                    <p className="text-slate-400 mt-0.5">
                      ใส่ชื่อเล่นของคุณ แล้วกด <strong>"สร้างห้องใหม่"</strong> ระบบจะสุ่ม Room ID 5 หลัก (เช่น <code>PK89A</code>)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <strong className="text-white">ชวนเพื่อนเข้าห้อง:</strong>
                    <p className="text-slate-400 mt-0.5">
                      กดปุ่ม <strong>"คัดลอกรหัสห้อง"</strong> หรือส่งรหัสให้เพื่อนนำไปใส่ที่ช่อง "เข้าร่วมห้อง (Join Room)"
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <strong className="text-white">กดเริ่มเกม (Start Game):</strong>
                    <p className="text-slate-400 mt-0.5">
                      เมื่อเพื่อนเข้ามาครบ หรือหากต้องการซ้อมคนเดียว สามารถกด <strong>"เพิ่มบอททดลอง"</strong> แล้ว Host กดเริ่มแจกไพ่ได้ทันที!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3.5">
              <h3 className="font-bold text-amber-300 text-sm">
                รอบการเล่นของ Texas Hold'em
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="font-bold text-white mb-1">1. Pre-Flop (ก่อนเปิดไพ่กลาง)</div>
                  <p className="text-slate-400 text-xs">
                    ผู้เล่นได้รับไพ่ลับ 2 ใบในมือ (Hole Cards) ผู้เล่นซ้ายมือ Dealer วาง Small Blind และ Big Blind จากนั้นผู้เล่นทุกคนตัดสินใจเดิมพัน
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="font-bold text-white mb-1">2. Flop (ไพ่กลาง 3 ใบแรก)</div>
                  <p className="text-slate-400 text-xs">
                    เปิดไพ่กองกลาง 3 ใบแรก ทุกคนสามารถนำมาจับคู่กับไพ่ในมือ แล้วเริ่มรอบเดิมพันรอบที่สอง
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="font-bold text-white mb-1">3. Turn (ไพ่กลางใบที่ 4)</div>
                  <p className="text-slate-400 text-xs">
                    เปิดไพ่กองกลางใบที่ 4 เพิ่มโอกาสสร้างชุดไพ่ที่แข็งแกร่งขึ้น แล้วเปิดรอบเดิมพันรอบที่สาม
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="font-bold text-white mb-1">4. River (ไพ่กลางใบที่ 5 สุดท้าย)</div>
                  <p className="text-slate-400 text-xs">
                    เปิดไพ่ใบที่ 5 ครบชุด และเป็นรอบเดิมพันสุดท้ายก่อนเปิดหน้าไพ่ตัดสิน (Showdown)
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-lg">
                <div className="font-bold text-amber-300 mb-1">คำสั่งเดิมพัน:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                  <li><strong>Fold (หมอบ):</strong> ยอมแพ้และทิ้งไพ่ เสียเฉพาะชิปที่ลงไปแล้ว</li>
                  <li><strong>Check (ผ่าน):</strong> ไม่เพิ่มเงินเดิมพัน ส่งต่อตาให้คนถัดไป (ใช้ได้เมื่อยังไม่มีใคร Raise)</li>
                  <li><strong>Call (ตาม):</strong> วางชิปเท่ากับจำนวนเดิมพันสูงสุดในรอบนั้น</li>
                  <li><strong>Raise (เกเพิ่ม):</strong> เพิ่มยอดเดิมพันให้สูงขึ้น บีบให้ผู้เล่นคนอื่นต้อง Call ตามหรือ Fold</li>
                  <li><strong>All-in (เทหน้าตัก):</strong> วางชิปทั้งหมดที่มี</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'hands' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">
                ผู้เล่นผสมไพ่ในมือ 2 ใบ และไพ่กองกลาง 5 ใบ เพื่อเลือก 5 ใบที่ดีที่สุด:
              </p>
              <div className="space-y-2">
                {handRanks.map((hr, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div>
                      <div className="font-bold text-amber-300">{hr.name}</div>
                      <div className="text-xs text-slate-400">{hr.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block">
                        {hr.example}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
