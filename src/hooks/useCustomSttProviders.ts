import { useState } from "react";
import { TYPE_PROVIDER } from "@/types";
import { SPEECH_TO_TEXT_PROVIDERS } from "@/config";
import { useApp } from "@/contexts";
import {
  addCustomSttProvider,
  getCustomSttProviders,
  removeCustomSttProvider,
  updateCustomSttProvider,
  validateCurl,
} from "@/lib";

export function useCustomSttProviders() {
  const { loadData } = useApp();
  const getInitialFormData = (): TYPE_PROVIDER => ({
    id: "",
    streaming: false,
    responseContentPath: "",
    isCustom: true,
    curl: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<TYPE_PROVIDER>(getInitialFormData());

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleEdit = (providerId: string) => {
    const customProviders = getCustomSttProviders();
    const provider = customProviders.find((p) => p.id === providerId);
    if (!provider) return;

    setFormData({
      ...provider,
    });
    setEditingProvider(providerId);
    setShowForm(true);
    setErrors({});
  };

  const handleAutoFill = (providerId: string) => {
    const provider = SPEECH_TO_TEXT_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;

    setFormData({
      ...provider,
      curl: provider.curl,
    });

    setErrors({});
  };

  const handleDelete = (providerId: string) => {
    setDeleteConfirm(providerId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const success = removeCustomSttProvider(deleteConfirm);
      if (success) {
        setDeleteConfirm(null);
        loadData();
      }
    } catch (error) {
      console.error("Failed to delete custom STT provider:", error);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleSave = async () => {
    // Validate form
    const newErrors: { [key: string]: string } = {};

    if (!formData.curl.trim()) {
      newErrors.curl = "请输入 cURL 命令。";
    } else {
      const hasAudioVar = formData.curl.includes("{{AUDIO}}");

      if (!hasAudioVar) {
        newErrors.curl = "cURL 命令必须包含 {{AUDIO}}。";
      } else {
        const validation = validateCurl(formData.curl, []);
        if (!validation.isValid) {
          newErrors.curl = validation.message || "";
        }
      }
    }

    if (!formData.responseContentPath?.trim()) {
      newErrors.responseContentPath = "请输入响应内容路径。";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      if (editingProvider) {
        const success = updateCustomSttProvider(editingProvider, {
          curl: formData.curl,
          streaming: false,
          responseContentPath: formData.responseContentPath,
        });

        if (success) {
          setEditingProvider(null);
          setShowForm(false);
          setFormData(getInitialFormData());
          loadData();
        }
      } else {
        const newProvider = {
          curl: formData.curl,
          streaming: false,
          responseContentPath: formData.responseContentPath,
        };

        const saved = addCustomSttProvider(newProvider);
        if (saved) {
          setShowForm(false);
          setFormData(getInitialFormData());
          loadData();
        }
      }
    } catch (error) {
      console.error("Failed to save custom STT provider:", error);
    }
  };

  return {
    errors,
    setErrors,
    showForm,
    setShowForm,
    editingProvider,
    setEditingProvider,
    deleteConfirm,
    formData,
    setFormData,
    handleSave,
    handleAutoFill,
    handleEdit,
    handleDelete,
    confirmDelete,
    cancelDelete,
  };
}
