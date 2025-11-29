import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Edit,
  Copy,
  Trash2,
  Search,
  LayoutGrid,
  X,
  ChevronDown,
  Loader2,
  Filter,
  Check,
} from "lucide-react";
import { Agent } from "../types";

interface AgentsProps {
  agents: Agent[];
  isLoading?: boolean;
  onToggleAgentStatus: (id: string) => void;
  onDeleteAgent: (id: string) => void;
  onCopyAgent: (agent: Agent) => void;
  onEditAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

export const Agents: React.FC<AgentsProps> = ({
  agents,
  isLoading = false,
  onToggleAgentStatus,
  onDeleteAgent,
  onCopyAgent,
  onEditAgent,
  onCreateAgent,
}) => {
  const { t } = useTranslation();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    active: true,
    createdAt: true,
  });
  const [filters, setFilters] = useState({
    status: "all", // all, active, inactive
    model: "all",
  });

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSelectAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelectedAgents(filteredAgents.map((a) => a.id));
  const deselectAll = () => setSelectedAgents([]);

  // Фильтрация агентов по поисковому запросу и фильтрам
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && agent.isActive) ||
      (filters.status === "inactive" && !agent.isActive);
    const matchesModel =
      filters.model === "all" || agent.model === filters.model;

    return matchesSearch && matchesStatus && matchesModel;
  });

  // Массовые действия
  const handleBulkDelete = () => {
    selectedAgents.forEach((id) => onDeleteAgent(id));
    setSelectedAgents([]);
    setShowActionsMenu(false);
  };

  const handleBulkActivate = () => {
    selectedAgents.forEach((id) => {
      const agent = agents.find((a) => a.id === id);
      if (agent && !agent.isActive) {
        onToggleAgentStatus(id);
      }
    });
    setSelectedAgents([]);
    setShowActionsMenu(false);
  };

  const handleBulkDeactivate = () => {
    selectedAgents.forEach((id) => {
      const agent = agents.find((a) => a.id === id);
      if (agent && agent.isActive) {
        onToggleAgentStatus(id);
      }
    });
    setSelectedAgents([]);
    setShowActionsMenu(false);
  };

  // Закрытие панелей при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Закрытие панели фильтров
      if (
        showFilterPanel &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPanel(false);
      }

      // Закрытие панели столбцов
      if (
        showColumnsPanel &&
        columnsPanelRef.current &&
        !columnsPanelRef.current.contains(event.target as Node) &&
        columnsButtonRef.current &&
        !columnsButtonRef.current.contains(event.target as Node)
      ) {
        setShowColumnsPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterPanel, showColumnsPanel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>{t("agents.title")}</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">
              {t("common.list")}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("agents.title")}
          </h1>
        </div>
        <button
          onClick={onCreateAgent}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
        >
          {t("common.create")}
        </button>
      </div>

      {/* Main container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors relative">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search")}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-8 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            ref={filterButtonRef}
            onClick={() => {
              setShowFilterPanel(!showFilterPanel);
              setShowColumnsPanel(false);
            }}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              showFilterPanel
                ? "bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30"
                : filters.status !== "all" || filters.model !== "all"
                  ? "bg-[#0078D4]/5 text-[#0078D4] border border-[#0078D4]/20 hover:bg-[#0078D4]/10"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            }`}
            title={t("common.filters")}
          >
            <Filter size={16} />
            {(filters.status !== "all" || filters.model !== "all") && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] bg-[#0078D4] text-white text-[9px] font-bold rounded-full">
                {(filters.status !== "all" ? 1 : 0) +
                  (filters.model !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
          <button
            ref={columnsButtonRef}
            onClick={() => {
              setShowColumnsPanel(!showColumnsPanel);
              setShowFilterPanel(false);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              showColumnsPanel
                ? "bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            }`}
            title={t("common.columns")}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Filter Panel - Modern sliding panel */}
        <div
          ref={filterPanelRef}
          className={`absolute top-12 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 transition-all duration-200 ease-out ${
            showFilterPanel
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#0078D4]" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t("common.filters")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(filters.status !== "all" || filters.model !== "all") && (
                  <button
                    onClick={() => setFilters({ status: "all", model: "all" })}
                    className="text-xs text-[#0078D4] hover:text-[#006cbd] font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {t("common.reset")}
                  </button>
                )}
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t("common.status")}
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none cursor-pointer transition-all"
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="active">{t("common.active")}</option>
                  <option value="inactive">{t("common.inactive")}</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t("agents.model")}
                </label>
                <select
                  value={filters.model}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, model: e.target.value }))
                  }
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none cursor-pointer transition-all"
                >
                  <option value="all">{t("agents.allModels")}</option>
                  <option value="OpenAI GPT-4.1">OpenAI GPT-4.1</option>
                  <option value="OpenAI GPT-4o">OpenAI GPT-4o</option>
                  <option value="OpenAI GPT-5">OpenAI GPT-5</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                  <option value="Google Gemini 2.5 Flash">
                    Google Gemini 2.5 Flash
                  </option>
                  <option value="Claude Sonnet 4">Claude Sonnet 4</option>
                </select>
              </div>
            </div>

            {/* Active filters indicator */}
            {(filters.status !== "all" || filters.model !== "all") && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#0078D4]/10 text-[#0078D4] text-xs font-medium">
                    <Check size={12} className="mr-1" />
                    {(filters.status !== "all" ? 1 : 0) +
                      (filters.model !== "all" ? 1 : 0)}{" "}
                    {t("common.filters").toLowerCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columns Panel - Modern sliding panel with toggle switches */}
        <div
          ref={columnsPanelRef}
          className={`absolute top-12 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 transition-all duration-200 ease-out ${
            showColumnsPanel
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-[#0078D4]" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t("common.columns")}
                </h3>
              </div>
              <button
                onClick={() => setShowColumnsPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-2">
            <div className="space-y-0.5">
              {/* Name column toggle */}
              <button
                onClick={() =>
                  setVisibleColumns((prev) => ({ ...prev, name: !prev.name }))
                }
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t("common.name")}
                </span>
                <div
                  className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                    visibleColumns.name
                      ? "bg-[#0078D4]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                      visibleColumns.name ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>

              {/* Active column toggle */}
              <button
                onClick={() =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    active: !prev.active,
                  }))
                }
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t("agents.isActive")}
                </span>
                <div
                  className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                    visibleColumns.active
                      ? "bg-[#0078D4]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                      visibleColumns.active
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>

              {/* Created At column toggle */}
              <button
                onClick={() =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    createdAt: !prev.createdAt,
                  }))
                }
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t("common.createdAt")}
                </span>
                <div
                  className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                    visibleColumns.createdAt
                      ? "bg-[#0078D4]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                      visibleColumns.createdAt
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("agents.loadingAgents")}
            </h3>
          </div>
        ) : filteredAgents.length > 0 ? (
          <>
            {/* Table */}
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={
                        selectedAgents.length === filteredAgents.length &&
                        filteredAgents.length > 0
                      }
                      onChange={() =>
                        selectedAgents.length === filteredAgents.length
                          ? deselectAll()
                          : selectAll()
                      }
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  {visibleColumns.name && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t("common.name")}{" "}
                      <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.active && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t("agents.isActive")}
                    </th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t("common.createdAt")}{" "}
                      <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => onEditAgent(agent.id)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectAgent(agent.id);
                        }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    {visibleColumns.name && (
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {agent.name}
                      </td>
                    )}
                    {visibleColumns.active && (
                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleAgentStatus(agent.id);
                          }}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${agent.isActive ? "bg-[#0078D4]" : "bg-gray-200 dark:bg-gray-600"}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${agent.isActive ? "translate-x-4" : "translate-x-0.5"}`}
                          />
                        </button>
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {agent.createdAt}
                      </td>
                    )}
                    <td
                      className="px-4 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAgent(agent.id);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyAgent(agent);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAgent(agent.id);
                          }}
                          className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {t("common.total")}: {filteredAgents.length}
              </span>
              <div className="flex items-center gap-2">
                <span>{t("common.perPage")}</span>
                <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <X size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {searchQuery
                ? t("agents.noAgentsForQuery")
                : t("agents.noAgentsFound")}
            </h3>
            {searchQuery && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("agents.tryDifferentQuery")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
