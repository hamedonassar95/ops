import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserPlus,
  Briefcase,
  X,
  Sparkles,
} from 'lucide-react';
import {
  GoogleContact,
  listContacts,
  searchContacts,
  createContact,
  updateContact,
  deleteContact,
} from '../../services/googleContactsService';

interface ContactsTabProps {
  token: string | null;
  onSignInClick: () => void;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({ token, onSignInClick }) => {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'sre' | 'vendors'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<GoogleContact | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<GoogleContact | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    givenName: '',
    familyName: '',
    email: '',
    phone: '',
    organization: '',
    jobTitle: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch contacts
  const fetchContacts = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listContacts(token);
      setContacts(data.contacts);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'فشل في استرداد جهات الاتصال من Google People API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchContacts();
    }
  }, [token]);

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchContacts(token, searchQuery);
      setContacts(results);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'فشل البحث في جهات الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Open Add Modal
  const handleOpenAddModal = (preset?: 'sre' | 'vendor') => {
    if (preset === 'sre') {
      setFormData({
        givenName: 'مهندس',
        familyName: 'المناوبة (SRE On-Call)',
        email: 'sre-oncall@example.com',
        phone: '+966 50 123 4567',
        organization: 'فريق عمليات السحابة والبنية التحتية',
        jobTitle: 'Senior SRE Lead',
      });
    } else if (preset === 'vendor') {
      setFormData({
        givenName: 'دعم',
        familyName: 'سحابة Google Cloud',
        email: 'cloud-support@example.com',
        phone: '+1 800 555 0199',
        organization: 'Google Cloud Platform',
        jobTitle: 'Enterprise Technical Support',
      });
    } else {
      setFormData({
        givenName: '',
        familyName: '',
        email: '',
        phone: '',
        organization: '',
        jobTitle: '',
      });
    }
    setEditingContact(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (contact: GoogleContact) => {
    setEditingContact(contact);
    const primaryName = contact.names?.[0];
    const primaryEmail = contact.emailAddresses?.[0]?.value || '';
    const primaryPhone = contact.phoneNumbers?.[0]?.value || '';
    const primaryOrg = contact.organizations?.[0]?.name || '';
    const primaryTitle = contact.organizations?.[0]?.title || '';

    setFormData({
      givenName: primaryName?.givenName || primaryName?.displayName || '',
      familyName: primaryName?.familyName || '',
      email: primaryEmail,
      phone: primaryPhone,
      organization: primaryOrg,
      jobTitle: primaryTitle,
    });
    setIsAddModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !formData.givenName.trim()) return;

    setSaving(true);
    try {
      if (editingContact) {
        await updateContact(
          token,
          editingContact.resourceName,
          editingContact.etag,
          formData
        );
        showNotification('success', 'تم تحديث جهة الاتصال في Google Contacts بنجاح.');
      } else {
        await createContact(token, formData);
        showNotification('success', 'تمت إضافة جهة اتصال جديدة إلى Google Contacts بنجاح.');
      }
      setIsAddModalOpen(false);
      await fetchContacts();
    } catch (err: any) {
      showNotification('error', err.message || 'فشلت عملية حفظ جهة الاتصال');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete with explicit confirmation
  const handleConfirmDelete = async () => {
    if (!token || !deleteCandidate) return;

    setDeleting(true);
    try {
      await deleteContact(token, deleteCandidate.resourceName);
      showNotification('success', 'تم حذف جهة الاتصال من Google Contacts بنجاح.');
      setDeleteCandidate(null);
      await fetchContacts();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل حذف جهة الاتصال');
    } finally {
      setDeleting(false);
    }
  };

  // Filter contacts locally
  const filteredContacts = contacts.filter((c) => {
    const org = c.organizations?.[0]?.name?.toLowerCase() || '';
    const title = c.organizations?.[0]?.title?.toLowerCase() || '';
    const name = c.names?.[0]?.displayName?.toLowerCase() || '';

    if (activeFilter === 'sre') {
      return (
        org.includes('sre') ||
        org.includes('devops') ||
        title.includes('sre') ||
        title.includes('engineer') ||
        title.includes('on-call') ||
        name.includes('sre') ||
        name.includes('مناوبة')
      );
    }
    if (activeFilter === 'vendors') {
      return (
        org.includes('cloud') ||
        org.includes('google') ||
        org.includes('aws') ||
        org.includes('support') ||
        org.includes('مزود') ||
        org.includes('دعم')
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span>إدارة جهات الاتصال (Google Contacts / People API)</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  فريق SRE والمناوبة
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                إدارة ومزامنة جهات اتصال فريق هندسة الموثوقية (SRE)، مسؤولي المناوبة، ومزودي الخدمات السحابية مباشرة مع حساب Google.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {token ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchContacts}
                  disabled={loading}
                  title="تحديث القائمة"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جهة اتصال</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onSignInClick}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>ربط حساب Google لعرض جهات الاتصال</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets for DevOps / SRE Teams */}
        {token && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>إضافة سريعة لفريق العمليات:</span>
              <button
                onClick={() => handleOpenAddModal('sre')}
                className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ مهندس مناوبة (SRE On-Call)</span>
              </button>
              <button
                onClick={() => handleOpenAddModal('vendor')}
                className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors flex items-center gap-1"
              >
                <Building className="w-3 h-3" />
                <span>+ مزود خدمة سحابية (GCP Support)</span>
              </button>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              إجمالي جهات الاتصال: <span className="text-indigo-400 font-bold">{contacts.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Unauthenticated State */}
      {!token && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">تسجيل الدخول مطلوب للوصول إلى Google Contacts</h3>
            <p className="text-xs text-slate-400">
              قم بتسجيل الدخول بحساب Google لمنح الصلاحية للتطبيق للاتصال بـ Google People API وقراءة وتحديث جهات الاتصال الخاصة بك بأمان.
            </p>
          </div>
          <button
            onClick={onSignInClick}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>تسجيل الدخول بحساب Google</span>
          </button>
        </div>
      )}

      {/* Authenticated Contact Management */}
      {token && (
        <>
          {/* Controls: Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، البريد الإلكتروني، أو جهة العمل..."
                className="w-full pl-10 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchContacts();
                  }}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({contacts.length})
              </button>
              <button
                onClick={() => setActiveFilter('sre')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeFilter === 'sre'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                فريق SRE والعمليات
              </button>
              <button
                onClick={() => setActiveFilter('vendors')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeFilter === 'vendors'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                المزودون والدعم
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">حدث خطأ أثناء الاتصال بـ Google People API:</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-16 text-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs font-semibold">جارٍ جلب وتحديث جهات الاتصال من Google...</p>
            </div>
          )}

          {/* Contacts Grid */}
          {!loading && filteredContacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => {
                const name =
                  contact.names?.[0]?.displayName ||
                  `${contact.names?.[0]?.givenName || ''} ${contact.names?.[0]?.familyName || ''}`.trim() ||
                  'جهة اتصال بدون اسم';
                const email = contact.emailAddresses?.[0]?.value;
                const phone = contact.phoneNumbers?.[0]?.value;
                const org = contact.organizations?.[0]?.name;
                const title = contact.organizations?.[0]?.title;
                const photoUrl = contact.photos?.[0]?.url;

                return (
                  <div
                    key={contact.resourceName}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Avatar and Name */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {photoUrl && !contact.photos?.[0]?.default ? (
                            <img
                              src={photoUrl}
                              alt={name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold text-sm flex items-center justify-center">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {name}
                            </h4>
                            {(title || org) && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{title ? `${title} - ${org || ''}` : org}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Controls */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(contact)}
                            title="تعديل جهة الاتصال"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(contact)}
                            title="حذف جهة الاتصال"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-2 text-slate-300 hover:text-indigo-400 transition-colors truncate"
                            dir="ltr"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{email}</span>
                          </a>
                        )}

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors"
                            dir="ltr"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{phone}</span>
                          </a>
                        )}

                        {!email && !phone && (
                          <p className="text-[11px] text-slate-500 italic">لا توجد تفاصيل بريد أو هاتف مسجلة</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Google Contacts</span>
                      <span className="text-emerald-400">Synced</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredContacts.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">لم يتم العثور على جهات اتصال</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `لا توجد نتائج مطابقة لـ "${searchQuery}". جرب البحث بكلمات أخرى.`
                  : 'قائمة جهات الاتصال فارغة أو لم تتم إضافة أي جهات اتصال في حسابك بعد.'}
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول جهة اتصال</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: Add / Edit Contact */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100 animate-fadeIn">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {editingContact ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال جديدة إلى Google Contacts'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">الاسم الأول *</label>
                  <input
                    type="text"
                    required
                    value={formData.givenName}
                    onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                    placeholder="e.g. محمد"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">اسم العائلة / اللقب</label>
                  <input
                    type="text"
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    placeholder="e.g. نصار"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. engineer@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +966 50 123 4567"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">المؤسسة / الشركة</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. ServerOps / SRE Team"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="e.g. DevOps Lead"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.givenName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'جارٍ الحفظ...' : editingContact ? 'حفظ التعديلات' : 'إضافة جهة الاتصال'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Explicit Confirmation Dialog for Delete Operation */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-700/60 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">تأكيد حذف جهة الاتصال</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جهة الاتصال{' '}
                <strong className="text-white">
                  "{deleteCandidate.names?.[0]?.displayName || deleteCandidate.names?.[0]?.givenName || 'جهة الاتصال'}"
                </strong>{' '}
                نهائياً من حساب Google الخاص بك؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md transition-all flex items-center gap-1.5"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
