import { useMemo, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import { isOpenTicket } from '../utils/normalizeAdminData';


const normalize = (s) => (s || '').toString().trim().toLowerCase();

export function useAdminPanelController() {
  const { currentUser } = useAuth();
  const {
    providers,
    bookings,
    tickets,
    respondToTicket,
    verifyProvider,
    updateBookingStatus,
    users,
    services,
    createService,
    updateService,
    deleteService,
    hideService,
    providerServiceRequests,
    fetchProviderServiceRequests,
    approveProviderServiceRequest,
    denyProviderServiceRequest,
  } = useData();

  const isAdmin = currentUser?.role === 'admin';

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [ticketResponse, setTicketResponse] = useState('');

  // SERVICES admin form
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);

  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    description: '',
    popularIssuesText: '',
    imageUrl: '',
  });

  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    description: '',
    popularIssuesText: '',
    imageUrl: '',
  });

  const [serviceAddError, setServiceAddError] = useState('');
  const [serviceAddSuccess, setServiceAddSuccess] = useState('');
  const [serviceEditError, setServiceEditError] = useState('');
  const [serviceEditSuccess, setServiceEditSuccess] = useState('');

  const customersList = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return list.filter((u) => u?.role === 'customer');
  }, [users]);

  const providersList = useMemo(() => {
    return providers || [];
  }, [providers]);

  const totalVolume = useMemo(() => {
    const bookingList = Array.isArray(bookings) ? bookings : [];
    return bookingList.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  }, [bookings]);

  const pendingPartnersCount = useMemo(() => {
    return (Array.isArray(providerServiceRequests) ? providerServiceRequests : []).filter(r => r.status === 'PENDING').length;
  }, [providerServiceRequests]);

  const activeTicketsCount = useMemo(() => {
    return (Array.isArray(tickets) ? tickets : []).filter((t) => isOpenTicket(t)).length;
  }, [tickets]);



  const handleTicketResolveSubmit = (tId) => {
    if (!ticketResponse.trim()) return;
    respondToTicket(tId, ticketResponse);
    setActiveTicketId(null);
    setTicketResponse('');
  };

  const handlePartnerApproval = (pId) => {
    verifyProvider(pId);
  };

  const partnerCountForService = (serviceName) => {
    const sn = normalize(serviceName);
    const svc = (Array.isArray(services) ? services : []).find(s => normalize(s.name) === sn);
    // Prefer the derived activeSpecialistCount from the backend (correct per spec)
    if (svc && typeof svc.activeSpecialistCount === 'number') return svc.activeSpecialistCount;
    // Fallback: count providers whose category matches
    return (providers || []).filter((p) => normalize(p.category) === sn).length;
  };

  const openAddService = () => {
    setServiceAddError('');
    setServiceAddSuccess('');
    setNewServiceForm({ name: '', description: '', popularIssuesText: '', imageUrl: '' });
    setIsAddingService(true);
  };

  const closeAddService = () => {
    setIsAddingService(false);
    setServiceAddError('');
    setServiceAddSuccess('');
  };

  const openEditService = (cat) => {
    setServiceEditError('');
    setServiceEditSuccess('');
    setEditServiceId(cat.id);
    setEditServiceForm({
      name: cat.name || '',
      description: cat.description || '',
      popularIssuesText: Array.isArray(cat.popularIssues) ? cat.popularIssues.join(', ') : '',
      imageUrl: cat.image || '',
    });
    setIsEditingService(true);
  };

  const closeEditService = () => {
    setIsEditingService(false);
    setEditServiceId(null);
    setServiceEditError('');
    setServiceEditSuccess('');
    setEditServiceForm({ name: '', description: '', popularIssuesText: '', imageUrl: '' });
  };

  const submitNewService = async (e) => {
    e.preventDefault();
    setServiceAddError('');
    setServiceAddSuccess('');

    const { name, description, popularIssuesText, imageUrl } = newServiceForm;

    if (!name.trim()) {
      setServiceAddError('Service name is required.');
      return;
    }
    if (!imageUrl.trim()) {
      setServiceAddError('A service photo is required — upload one before saving the service.');
      return;
    }

    const popularIssues = popularIssuesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
      popularIssues,
      image: imageUrl.trim(),
    };

    const resp = await createService(payload);

    if (!resp?.id && !resp?.createdAt) {
      setServiceAddError(resp?.message || resp?.error || 'Failed to create service.');
      return;
    }

    setServiceAddSuccess('Service added successfully.');
    setIsAddingService(false);
    setNewServiceForm({ name: '', description: '', popularIssuesText: '', imageUrl: '' });
  };

  const submitEditService = async (e) => {
    e.preventDefault();
    setServiceEditError('');
    setServiceEditSuccess('');

    const { name, description, popularIssuesText, imageUrl } = editServiceForm;
    if (!name.trim()) {
      setServiceEditError('Service name is required.');
      return;
    }

    const popularIssues = popularIssuesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
      popularIssues,
    };
    if (imageUrl.trim()) payload.image = imageUrl.trim();

    const resp = await updateService(editServiceId, payload);

    if (!resp?.service) {
      setServiceEditError(resp?.message || resp?.error || 'Failed to update service.');
      return;
    }

    setServiceEditSuccess('Service updated successfully.');
    setTimeout(() => {
      setServiceEditSuccess('');
      closeEditService();
    }, 900);
  };

  return {
    // data
    isAdmin,
    currentUser,
    users,
    providers,
    providersList,
    services,
    bookings: Array.isArray(bookings) ? bookings : [],
    tickets: Array.isArray(tickets) ? tickets : [],
    customersList,

    // dashboard stats
    totalVolume,
    pendingPartnersCount,
    activeTicketsCount,

    // tickets
    activeTicketId,
    ticketResponse,
    setTicketResponse,
    setActiveTicketId,
    handleTicketResolveSubmit,

    // providers
    handlePartnerApproval,

    // services
    isAddingService,
    isEditingService,
    editServiceId,

    newServiceForm,
    editServiceForm,
    serviceAddError,
    serviceAddSuccess,
    serviceEditError,
    serviceEditSuccess,

    openAddService,
    closeAddService,
    openEditService,
    closeEditService,
    setNewServiceForm,
    setEditServiceForm,
    submitNewService,
    submitEditService,

    partnerCountForService,

    deleteService,
    hideService,
    updateService,
    createService,

    // misc admin
    fetchProviderServiceRequests,
    providerServiceRequests,
    approveProviderServiceRequest,
    denyProviderServiceRequest,
    updateBookingStatus,
  };
}

