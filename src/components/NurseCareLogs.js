import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Save, 
  X,
  Calendar,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createCareLog, getCareLogsByClient, updateCareLog, deleteCareLog } from '../api/careLogsAPI';
import { useUser } from '../contexts/UserContext';

const NurseCareLogs = ({ clientId, clientName, nurseId, nurseName, onSave, onCancel }) => {
  const { institutionId } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [careLogs, setCareLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: 'assessment',
    title: '',
    content: '',
    priority: 'normal',
    tags: [],
    careActivities: [],
    patientCondition: 'stable',
    medicationsGiven: [],
    vitalSignsNoted: false,
    followUpRequired: false,
    followUpNotes: ''
  });
  const [editingLog, setEditingLog] = useState(null);

  const categories = [
    { value: 'assessment', label: 'Assessment', icon: Activity },
    { value: 'medication', label: 'Medication', icon: FileText },
    { value: 'treatment', label: 'Treatment', icon: CheckCircle },
    { value: 'observation', label: 'Observation', icon: Eye },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { value: 'follow_up', label: 'Follow-up', icon: Calendar },
    { value: 'education', label: 'Client Education', icon: User },
    { value: 'other', label: 'Other', icon: FileText }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' }
  ];

  const patientConditions = [
    { value: 'stable', label: 'Stable', color: 'green' },
    { value: 'improving', label: 'Improving', color: 'blue' },
    { value: 'deteriorating', label: 'Deteriorating', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'unstable', label: 'Unstable', color: 'red' }
  ];

  const commonTags = [
    'pain management',
    'mobility',
    'nutrition',
    'hygiene',
    'medication compliance',
    'vital signs',
    'wound care',
    'Client comfort',
    'family communication',
    'safety concerns'
  ];

  const commonActivities = [
    'Vital signs assessment',
    'Medication administration',
    'Wound care',
    'Mobility assistance',
    'Pain assessment',
    'Nutrition support',
    'Hygiene assistance',
    'Safety check',
    'Client education',
    'Family communication'
  ];

  useEffect(() => {
    loadCareLogs();
  }, [clientId]);

  const loadCareLogs = async () => {
    try {
      setLoading(true);
      const logs = await getCareLogsByClient(clientId);
      setCareLogs(logs || []);
    } catch (error) {
      console.error('Error loading care logs:', error);
      toast.error('Failed to load care logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    setLoading(true);
    
    try {
      const careLogData = {
        clientId,
        clientName,
        caregiverId: nurseId,
        caregiverName: nurseName,
        category: formData.category,
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        tags: formData.tags,
        careActivities: formData.careActivities,
        patientCondition: formData.patientCondition,
        medicationsGiven: formData.medicationsGiven,
        vitalSignsNoted: formData.vitalSignsNoted,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes.trim(),
        status: 'active'
      };

      if (editingLog) {
        await updateCareLog(editingLog.id, careLogData);
        toast.success('Care log updated successfully');
      } else {
        await createCareLog(careLogData, institutionId);
        toast.success('Care log created successfully');
      }

      // Reset form
      setFormData({
        category: 'assessment',
        title: '',
        content: '',
        priority: 'normal',
        tags: [],
        careActivities: [],
        patientCondition: 'stable',
        medicationsGiven: [],
        vitalSignsNoted: false,
        followUpRequired: false,
        followUpNotes: ''
      });
      
      setShowForm(false);
      setEditingLog(null);
      
      // Reload care logs
      await loadCareLogs();
      
      if (onSave) {
        onSave();
      }
      
    } catch (error) {
      console.error('Error saving care log:', error);
      toast.error('Failed to save care log');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      category: log.category || 'assessment',
      title: log.title || '',
      content: log.content || '',
      priority: log.priority || 'normal',
      tags: log.tags || [],
      careActivities: log.careActivities || [],
      patientCondition: log.patientCondition || 'stable',
      medicationsGiven: log.medicationsGiven || [],
      vitalSignsNoted: log.vitalSignsNoted || false,
      followUpRequired: log.followUpRequired || false,
      followUpNotes: log.followUpNotes || ''
    });
    setEditingLog(log);
    setShowForm(true);
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this care log?')) {
      return;
    }

    try {
      await deleteCareLog(logId);
      toast.success('Care log deleted successfully');
      await loadCareLogs();
    } catch (error) {
      console.error('Error deleting care log:', error);
      toast.error('Failed to delete care log');
    }
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleActivityToggle = (activity) => {
    setFormData(prev => ({
      ...prev,
      careActivities: prev.careActivities.includes(activity)
        ? prev.careActivities.filter(a => a !== activity)
        : [...prev.careActivities, activity]
    }));
  };

  const getPriorityColor = (priority) => {
    const p = priorities.find(pr => pr.value === priority);
    return p ? p.color : 'gray';
  };

  const getConditionColor = (condition) => {
    const c = patientConditions.find(cond => cond.value === condition);
    return c ? c.color : 'gray';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Care Logs</h2>
                <p className="text-sm text-gray-600">Client: {clientName}</p>
                <p className="text-xs text-gray-500">Nurse: {nurseName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showForm ? 'Hide Form' : 'New Log'}
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Care Log Form */}
          {showForm && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingLog ? 'Edit Care Log' : 'New Care Log'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of the care activity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Detailed description of care provided, observations, and Client response..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Client Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Condition</label>
                  <select
                    value={formData.patientCondition}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientCondition: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {patientConditions.map(condition => (
                      <option key={condition.value} value={condition.value}>{condition.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {commonTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          formData.tags.includes(tag)
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Care Activities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Care Activities</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {commonActivities.map(activity => (
                      <label key={activity} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.careActivities.includes(activity)}
                          onChange={() => handleActivityToggle(activity)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{activity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.vitalSignsNoted}
                      onChange={(e) => setFormData(prev => ({ ...prev, vitalSignsNoted: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Vital signs recorded</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.followUpRequired}
                      onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Follow-up required</span>
                  </label>
                </div>

                {/* Follow-up Notes */}
                {formData.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes</label>
                    <textarea
                      value={formData.followUpNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                      placeholder="Details about required follow-up..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingLog(null);
                      setFormData({
                        category: 'assessment',
                        title: '',
                        content: '',
                        priority: 'normal',
                        tags: [],
                        careActivities: [],
                        patientCondition: 'stable',
                        medicationsGiven: [],
                        vitalSignsNoted: false,
                        followUpRequired: false,
                        followUpNotes: ''
                      });
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingLog ? 'Update Log' : 'Save Log'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Care Logs List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Care Logs ({careLogs.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : careLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No care logs found for this client.</p>
                <p className="text-sm">Create your first care log using the form above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {careLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{log.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${getPriorityColor(log.priority)}-100 text-${getPriorityColor(log.priority)}-800`}>
                            {priorities.find(p => p.value === log.priority)?.label || 'Normal'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${getConditionColor(log.patientCondition)}-100 text-${getConditionColor(log.patientCondition)}-800`}>
                            {patientConditions.find(c => c.value === log.patientCondition)?.label || 'Stable'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(log.createdAt)}
                          <span className="mx-2">•</span>
                          <User className="h-4 w-4 mr-1" />
                          {log.caregiverName || 'Unknown Nurse'}
                        </div>
                        
                        <p className="text-gray-700 mb-3">{log.content}</p>
                        
                        {log.tags && log.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {log.tags.map(tag => (
                              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {log.careActivities && log.careActivities.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Care Activities:</h5>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {log.careActivities.map(activity => (
                                <li key={activity}>{activity}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {log.followUpRequired && log.followUpNotes && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <h5 className="text-sm font-medium text-yellow-800 mb-1">Follow-up Required:</h5>
                            <p className="text-sm text-yellow-700">{log.followUpNotes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(log)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseCareLogs;
