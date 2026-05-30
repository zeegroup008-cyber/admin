import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import pb from "../lib/pb"
function getProofUrl(t) {
  if (!t || !t.bukti_transfer) return null
  return "https://yuzri-api.onrender.com/api/files/" + t.collectionId + "/" + t.id + "/" + t.bukti_transfer
}

function fmt(n) { return "Rp " + Number(n ?? 0).toLocaleString("id-ID") }

function ProofThumb({ url, onZoom }) {
  if (!url) return <span className="text-[#8888aa] text-xs">-</span>
  return (
    <button onClick={onZoom}
      className="relative group w-10 h-10 rounded-lg overflow-hidden border border-[#2a2b45] hover:border-[#7c5cfc] transition-colors flex-shrink-0">
      <img src={url} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-[11px]">🔍</span>
      </div>
    </button>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers]                   = useState([])
  const [transactions, setTransactions]     = useState([])
  const [loading, setLoading]               = useState(true)
  const [activeTab, setActiveTab]           = useState("dashboard")
  const [search, setSearch]                 = useState("")
  const [filterStatus, setFilterStatus]     = useState("Semua")
  const [rejectModal, setRejectModal]       = useState(null)
  const [rejectReason, setRejectReason]     = useState("")
  const [detailModal, setDetailModal]       = useState(null)
  const [confirmApprove, setConfirmApprove] = useState(null)
  const [imageZoom, setImageZoom]           = useState(null)
  const [actionLoading, setActionLoading]   = useState(null)

  useEffect(() => {
    if (!pb.authStore.isValid) { navigate("/"); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const u = await pb.collection("users").getFullList({ sort: "-created", requestKey: null })
      const t = await pb.collection("transactions").getFullList({
        sort: "-created",
        requestKey: null,
        // PocketBase returns all fields including bukti_transfer and paket_name by default
      })
      setUsers(u)
      setTransactions(t)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleLogout = () => { pb.authStore.clear(); navigate("/") }

  const handleApprove = async (trx) => {
    setConfirmApprove(null)
    setActionLoading(trx.id)
    try {
      await pb.collection("transactions").update(trx.id, {
        status: "Approved",
        approved_by: pb.authStore.model?.email,
        notes: "Disetujui oleh admin pada " + new Date().toLocaleString("id-ID"),
      })
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setActionLoading(rejectModal.id)
    try {
      await pb.collection("transactions").update(rejectModal.id, {
        status: "Rejected",
        reject_reason: rejectReason,
        approved_by: pb.authStore.model?.email,
        notes: "Ditolak oleh admin pada " + new Date().toLocaleString("id-ID"),
      })
      setRejectModal(null)
      setRejectReason("")
      await fetchData()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const pending  = transactions.filter(t => t.status === "Pending")
  const approved = transactions.filter(t => t.status === "Approved")
  const rejected = transactions.filter(t => t.status === "Rejected")

  const filteredTrx = transactions.filter(t => {
    const matchStatus = filterStatus === "Semua" || t.status === filterStatus
    const matchSearch = search === "" ||
      t.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.target_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.id?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const stats = [
    { label: "Total User",  nilai: users.length,    icon: "👥", color: "#7c5cfc" },
    { label: "Pending",     nilai: pending.length,  icon: "⏳", color: "#f59e0b" },
    { label: "Approved",    nilai: approved.length, icon: "✅", color: "#22c55e" },
    { label: "Rejected",    nilai: rejected.length, icon: "❌", color: "#ef4444" },
  ]

  const menuItems = [
    { id: "dashboard", label: "Dashboard",        icon: "📊" },
    { id: "transaksi", label: "Transaksi",         icon: "💳", badge: pending.length },
    { id: "riwayat",   label: "Riwayat Transaksi", icon: "📋" },
    { id: "users",     label: "Manajemen User",    icon: "👥" },
  ]

  const statusBadge = (status) => {
    const map = {
      Pending:  { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" },
      Approved: { bg: "rgba(34,197,94,0.15)",   color: "#22c55e" },
      Rejected: { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
    }
    const s = map[status] || { bg: "rgba(136,136,170,0.15)", color: "#8888aa" }
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:s.bg,color:s.color}}>{status}</span>
  }

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[#111028] border-b border-white/10 px-6 h-16 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/Logo.png" alt="YuzriID" className="h-8 w-auto object-contain" />
          <span className="text-white/30">|</span>
          <span className="text-white/60 text-sm">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs hidden md:block">{pb.authStore.model?.email}</span>
          <a href="http://localhost:5173" target="_blank" className="text-white/50 hover:text-white text-sm no-underline">← Website</a>
          <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm px-4 py-1.5 rounded-lg transition-colors">Keluar</button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-56 bg-[#111028] border-r border-white/10 p-4 flex flex-col gap-1 flex-shrink-0">
          {menuItems.map((m) => (
            <button key={m.id} onClick={() => setActiveTab(m.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left w-full relative"
              style={{background:activeTab===m.id?"#7c5cfc":"transparent",color:activeTab===m.id?"white":"#8888aa",fontWeight:activeTab===m.id?600:400}}>
              <span>{m.icon}</span>
              <span className="flex-1">{m.label}</span>
              {m.badge > 0 && <span className="text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{m.badge}</span>}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-[#8888aa]">
              <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>Memuat data...
            </div>
          ) : (
            <>
              {/* ── DASHBOARD ── */}
              {activeTab === "dashboard" && (
                <div>
                  <h1 style={{fontFamily:"Syne,sans-serif",fontWeight:800}} className="text-2xl mb-2">Dashboard</h1>
                  <p className="text-[#8888aa] text-sm mb-6">Ringkasan platform YuzriID.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((s) => (
                      <div key={s.label} className="bg-[#181929] border border-[#2a2b45] rounded-2xl p-5">
                        <div className="text-2xl mb-3">{s.icon}</div>
                        <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,color:s.color}} className="text-3xl mb-1">{s.nilai}</div>
                        <div className="text-[#8888aa] text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <h2 className="font-semibold text-lg mb-4">Transaksi Pending Terbaru</h2>
                  <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl overflow-hidden">
                    {pending.length === 0 ? (
                      <div className="text-center py-10 text-[#8888aa] text-sm">Tidak ada transaksi pending.</div>
                    ) : pending.slice(0,5).map((t,i) => (
                      <div key={t.id} className={`flex items-center gap-4 px-5 py-4 ${i!==0?"border-t border-[#2a2b45]":""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {t.ticket_id && <span className="text-[#9b7ffe] text-xs font-bold">{t.ticket_id}</span>}
                            <p className="text-white text-sm font-medium truncate">{t.product_name}</p>
                          </div>
                          <p className="text-[#8888aa] text-xs">{t.target_id} · {new Date(t.created).toLocaleString("id-ID")}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-white text-sm font-semibold">{fmt(t.amount)}</p>
                          {statusBadge(t.status)}
                          <button onClick={() => setActiveTab("transaksi")} className="text-xs text-[#9b7ffe] hover:underline">Kelola</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TRANSAKSI PENDING ── */}
              {activeTab === "transaksi" && (
                <div>
                  <h1 style={{fontFamily:"Syne,sans-serif",fontWeight:800}} className="text-2xl mb-2">Transaksi Pending</h1>
                  <p className="text-[#8888aa] text-sm mb-6">{pending.length} transaksi menunggu konfirmasi.</p>
                  <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl overflow-x-auto">
                    <div className="min-w-[860px]">
                      <div className="grid px-5 py-3 border-b border-[#2a2b45] text-[#8888aa] text-xs font-semibold uppercase tracking-wider"
                        style={{gridTemplateColumns:"110px 1fr 130px 90px 60px 100px 170px"}}>
                        <span>No. Tiket</span><span>Produk</span><span>Target</span><span>Metode</span><span>Bukti</span><span>Nominal</span><span>Aksi</span>
                      </div>
                      {pending.length === 0 ? (
                        <div className="text-center py-10 text-[#8888aa] text-sm">Tidak ada transaksi pending.</div>
                      ) : pending.map((t,i) => {
                        const proofUrl = getProofUrl(t)
                        return (
                          <div key={t.id} className={`grid px-5 py-4 items-center ${i!==0?"border-t border-[#2a2b45]":""}`}
                            style={{gridTemplateColumns:"110px 1fr 130px 90px 60px 100px 170px"}}>
                            <span className="text-[#9b7ffe] text-xs font-bold truncate">{t.ticket_id || t.id.slice(0,8)}</span>
                            <div className="min-w-0 pr-2">
                              <p className="text-white text-sm font-medium truncate">{t.product_name}</p>
                              <p className="text-[#8888aa] text-xs">{new Date(t.created).toLocaleString("id-ID")}</p>
                            </div>
                            <span className="text-[#8888aa] text-xs truncate">{t.target_id || "-"}</span>
                            <span className="text-[#8888aa] text-xs truncate">{t.payment_method || "-"}</span>
                            <ProofThumb url={proofUrl} onZoom={() => setImageZoom(proofUrl)} />
                            <span className="text-white text-sm font-semibold">{fmt(t.amount)}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => setDetailModal(t)}
                                className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white transition-colors">
                                Detail
                              </button>
                              <button onClick={() => setConfirmApprove(t)} disabled={actionLoading===t.id}
                                className="text-xs px-2 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50">
                                {actionLoading===t.id ? "..." : "Approve"}
                              </button>
                              <button onClick={() => { setRejectModal(t); setRejectReason("") }} disabled={actionLoading===t.id}
                                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50">
                                Reject
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── RIWAYAT ── */}
              {activeTab === "riwayat" && (
                <div>
                  <h1 style={{fontFamily:"Syne,sans-serif",fontWeight:800}} className="text-2xl mb-2">Riwayat Transaksi</h1>
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Cari tiket, produk, atau target..."
                      className="bg-[#181929] border border-[#2a2b45] rounded-xl px-4 py-2 text-white text-sm outline-none placeholder:text-[#8888aa] focus:border-[#7c5cfc] transition-colors w-72" />
                    {["Semua","Pending","Approved","Rejected"].map(f => (
                      <button key={f} onClick={() => setFilterStatus(f)}
                        className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                        style={{background:filterStatus===f?"#7c5cfc":"transparent",borderColor:filterStatus===f?"#7c5cfc":"#2a2b45",color:filterStatus===f?"white":"#8888aa"}}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl overflow-x-auto">
                    <div className="min-w-[820px]">
                      <div className="grid px-5 py-3 border-b border-[#2a2b45] text-[#8888aa] text-xs font-semibold uppercase tracking-wider"
                        style={{gridTemplateColumns:"110px 1fr 130px 90px 60px 100px 110px"}}>
                        <span>No. Tiket</span>
                        <span>Produk</span>
                        <span>Target</span>
                        <span>Metode</span>
                        <span>Bukti</span>
                        <span>Nominal</span>
                        <span>Status</span>
                      </div>
                      {filteredTrx.length === 0 ? (
                        <div className="text-center py-10 text-[#8888aa] text-sm">Tidak ada transaksi.</div>
                      ) : filteredTrx.map((t,i) => {
                        const proofUrl = getProofUrl(t)
                        return (
                          <div key={t.id} className={`grid px-5 py-3.5 items-center ${i!==0?"border-t border-[#2a2b45]":""}`}
                            style={{gridTemplateColumns:"110px 1fr 130px 90px 60px 100px 110px"}}>
                            <span className="text-[#9b7ffe] text-xs font-bold truncate">{t.ticket_id || t.id.slice(0,8)}</span>
                            <div className="min-w-0 pr-2">
                              <p className="text-white text-sm font-medium truncate">{t.product_name}</p>
                              <p className="text-[#8888aa] text-xs">{new Date(t.created).toLocaleString("id-ID")}</p>
                              {t.reject_reason && <p className="text-red-400 text-xs mt-0.5 truncate">Alasan: {t.reject_reason}</p>}
                            </div>
                            <span className="text-[#8888aa] text-xs truncate">{t.target_id || "-"}</span>
                            <span className="text-[#8888aa] text-xs truncate">{t.payment_method || "-"}</span>
                            <ProofThumb url={proofUrl} onZoom={() => setImageZoom(proofUrl)} />
                            <span className="text-white text-sm font-semibold">{fmt(t.amount)}</span>
                            <div className="flex items-center gap-2">
                              {statusBadge(t.status)}
                              <button onClick={() => setDetailModal(t)} className="text-xs text-[#9b7ffe] hover:underline flex-shrink-0">Detail</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── USERS ── */}
              {activeTab === "users" && (
                <div>
                  <h1 style={{fontFamily:"Syne,sans-serif",fontWeight:800}} className="text-2xl mb-2">Manajemen User</h1>
                  <p className="text-[#8888aa] text-sm mb-6">Total {users.length} user terdaftar.</p>
                  <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-4 px-5 py-3 border-b border-[#2a2b45] text-[#8888aa] text-xs font-semibold uppercase tracking-wider">
                      <span>Nama</span><span>Email</span><span>Terdaftar</span><span>Status</span>
                    </div>
                    {users.length === 0 ? (
                      <div className="text-center py-10 text-[#8888aa] text-sm">Belum ada user.</div>
                    ) : users.map((u,i) => (
                      <div key={u.id} className={`grid grid-cols-4 px-5 py-3.5 items-center ${i!==0?"border-t border-[#2a2b45]":""}`}>
                        <span className="text-white text-sm font-medium truncate">{u.name || "-"}</span>
                        <span className="text-[#8888aa] text-sm truncate">{u.email}</span>
                        <span className="text-[#8888aa] text-xs">{new Date(u.created).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full w-fit" style={{background:"rgba(34,197,94,0.1)",color:"#22c55e"}}>Aktif</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL: Konfirmasi Approve ── */}
      {confirmApprove && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-xl flex-shrink-0">✅</div>
              <div>
                <h2 className="font-semibold text-white text-lg leading-tight">Setujui Transaksi?</h2>
                <p className="text-[#8888aa] text-xs">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="bg-[#10111f] border border-[#2a2b45] rounded-xl p-4 mb-5 space-y-2">
              {[
                { label: "No. Tiket",  value: confirmApprove.ticket_id || "-",       color: "#9b7ffe" },
                { label: "Produk",     value: confirmApprove.product_name || "-",    color: "white" },
                { label: "Target",     value: confirmApprove.target_id || "-",       color: "white" },
                { label: "Metode",     value: confirmApprove.payment_method || "-",  color: "white" },
                { label: "Nominal",    value: fmt(confirmApprove.amount),            color: "#22c55e" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[#8888aa] text-xs">{label}</span>
                  <span className="text-xs font-semibold text-right max-w-[60%] break-all" style={{ color }}>{value}</span>
                </div>
              ))}
              {getProofUrl(confirmApprove) && (
                <div className="pt-2 border-t border-[#2a2b45]">
                  <p className="text-[#8888aa] text-xs mb-1.5">Bukti Transfer:</p>
                  <img src={getProofUrl(confirmApprove)} className="w-full max-h-32 object-contain rounded-lg border border-[#2a2b45] cursor-pointer"
                    onClick={() => setImageZoom(getProofUrl(confirmApprove))} />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmApprove(null)}
                className="flex-1 border border-[#2a2b45] hover:border-white/30 text-white/60 hover:text-white py-2.5 rounded-xl text-sm transition-colors">
                Batal
              </button>
              <button onClick={() => handleApprove(confirmApprove)} disabled={actionLoading === confirmApprove.id}
                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {actionLoading === confirmApprove.id ? "Memproses..." : "Ya, Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reject ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-white text-lg mb-1">Tolak Transaksi</h2>
            {rejectModal.ticket_id && <p className="text-[#9b7ffe] text-xs font-bold mb-1">{rejectModal.ticket_id}</p>}
            <p className="text-[#8888aa] text-sm mb-4">{rejectModal.product_name}</p>
            <label className="block text-sm text-white/70 mb-1.5">Alasan Penolakan <span className="text-red-400">*</span></label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Bukti transfer tidak valid, nominal tidak sesuai..."
              rows={3}
              className="w-full bg-[#10111f] border border-[#2a2b45] rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-[#8888aa] focus:border-[#7c5cfc] transition-colors resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 border border-[#2a2b45] hover:border-white/30 text-white/60 hover:text-white py-2.5 rounded-xl text-sm transition-colors">
                Batal
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || !!actionLoading}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {actionLoading ? "Memproses..." : "Tolak Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail Transaksi ── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#181929] border border-[#2a2b45] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-lg">Detail Transaksi</h2>
              <button onClick={() => setDetailModal(null)} className="text-[#8888aa] hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-0 mb-4">
              {[
                { label: "No. Tiket",      value: detailModal.ticket_id || "-",        highlight: true },
                { label: "ID Transaksi",   value: detailModal.id },
                { label: "Produk",         value: detailModal.product_name || "-" },
                ...(detailModal.paket_name ? [{ label: "Paket", value: detailModal.paket_name }] : []),
                { label: "Target / Email", value: detailModal.target_id || "-" },
                { label: "Metode Bayar",   value: detailModal.payment_method || "-",   accent: true },
                { label: "Nominal",        value: fmt(detailModal.amount),             green: true },
                { label: "Status",         value: detailModal.status },
                { label: "Tanggal",        value: new Date(detailModal.created).toLocaleString("id-ID") },
                { label: "Diproses oleh",  value: detailModal.approved_by || "-" },
                ...(detailModal.reject_reason ? [{ label: "Alasan Tolak", value: detailModal.reject_reason, red: true }] : []),
                { label: "Catatan",        value: detailModal.notes || "-" },
              ].map(({ label, value, highlight, accent, green, red }) => (
                <div key={label} className="flex justify-between py-2.5 border-b border-[#2a2b45]">
                  <span className="text-[#8888aa] text-sm flex-shrink-0">{label}</span>
                  <span className={`text-sm font-medium text-right max-w-[60%] break-all ml-2 ${
                    highlight ? "text-[#9b7ffe] font-bold" :
                    accent    ? "text-[#a78bfa]" :
                    green     ? "text-green-400 font-bold" :
                    red       ? "text-red-400" : "text-white"
                  }`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Bukti Transfer */}
            {getProofUrl(detailModal) ? (
              <div className="mb-4">
                <p className="text-[#8888aa] text-xs mb-2 font-semibold uppercase tracking-wider">Bukti Transfer</p>
                <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-[#2a2b45] hover:border-[#7c5cfc] transition-colors"
                  onClick={() => setImageZoom(getProofUrl(detailModal))}>
                  <img src={getProofUrl(detailModal)} className="w-full max-h-48 object-contain bg-[#10111f]" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-semibold bg-black/60 px-3 py-1.5 rounded-lg">🔍 Perbesar</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 py-2.5 border-b border-[#2a2b45] flex justify-between">
                <span className="text-[#8888aa] text-sm">Bukti Transfer</span>
                <span className="text-[#8888aa] text-sm">-</span>
              </div>
            )}

            <button onClick={() => setDetailModal(null)}
              className="w-full bg-[#7c5cfc] hover:bg-[#5b3fd4] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Image Zoom ── */}
      {imageZoom && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center px-4"
          onClick={() => setImageZoom(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setImageZoom(null)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white text-3xl leading-none">×</button>
            <img src={imageZoom} className="w-full max-h-[80vh] object-contain rounded-2xl border border-white/10" />
            <p className="text-center text-white/40 text-xs mt-3">Klik di luar gambar untuk menutup</p>
          </div>
        </div>
      )}
    </div>
  )
}




