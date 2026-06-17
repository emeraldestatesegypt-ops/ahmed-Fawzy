import React, { useState, useEffect, useRef } from 'react';
import { PropertyClientRecord, SyncLog } from '../types';
import { 
  Grid, Download, Upload, RefreshCw, Sparkles, Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, Play, Database, FileSpreadsheet, Plus, Trash2, ArrowUpDown, Search, Smile,
  ShieldCheck, AlertTriangle
} from 'lucide-react';

export type ValidationRuleType = 'phone' | 'numeric' | 'numeric_range' | 'email' | 'non_empty';

export type ValidationRule = {
  id: string;
  column: string;
  type: ValidationRuleType;
  min?: number;
  max?: number;
  errorMessage?: string;
};

type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string; // e.g. '#2563EB'
  bg?: string; // e.g. '#EFF6FF'
};

type CellData = {
  value: string; // Raw input (e.g., "=SUM(E2:E6)" or "1500000")
  computedValue?: string; // Result of formula
  style?: CellStyle;
};

type SheetData = {
  [cellRef: string]: CellData; // e.g., "A1": { value: "100" }
};

type SheetInfo = {
  id: string;
  name: string;
  data: SheetData;
  headers: string[]; // List of active columns e.g. ["A", "B", "C", "D", "E"...]
  rowCount: number;
};

export type ConditionalRule = {
  id: string;
  column: string; // e.g. "F" or "E"
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string; // e.g. "Closed Sold" or "10M"
  applyTo: 'cell' | 'row';
  style: {
    bg?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
  };
};

interface ExcelSpreadsheetAppProps {
  propertyClients: PropertyClientRecord[];
  onUpdatePropertyClients: (updated: PropertyClientRecord[]) => void;
  syncLogs: SyncLog[];
}

export default function ExcelSpreadsheetApp({ 
  propertyClients, 
  onUpdatePropertyClients,
  syncLogs
}: ExcelSpreadsheetAppProps) {
  
  // Spreadsheet core states
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('leads');
  const [isSyncingCRM, setIsSyncingCRM] = useState(false);
  const [crmSyncMessage, setCrmSyncMessage] = useState('');
  
  // Selection state
  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({ row: 1, col: 1 });
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>({ row: 1, col: 1 });
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>({ row: 1, col: 1 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Search highlighting state
  const [searchQuery, setSearchQuery] = useState('');

  // CSV Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvRaw, setImportCsvRaw] = useState('');
  const [importTargetTab, setImportTargetTab] = useState('active');

  // AI Copilot state
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotResponse, setCopilotResponse] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<{role: 'user' | 'assistant'; text: string}[]>([
    { role: 'assistant', text: "Hello! I am your Sierra Estates Excel Copilot. You can ask me to write complex formulas, synthesize lead datasets, or analyze pricing trends!" }
  ]);

  // Conditional formatting states
  const [conditionalRules, setConditionalRules] = useState<{ [sheetId: string]: ConditionalRule[] }>({
    leads: [
      {
        id: 'rule-status-closed',
        column: 'F', // Column F is Lead Status
        operator: 'equals',
        value: 'Closed Sold',
        applyTo: 'row',
        style: { bg: '#dcfce7', color: '#15803d', bold: true }
      },
      {
        id: 'rule-value-high',
        column: 'E', // Column E is Deal Value
        operator: 'greater_than',
        value: '10M',
        applyTo: 'cell',
        style: { bg: '#fffbeb', color: '#b45309', bold: true }
      }
    ],
    properties: [
      {
        id: 'rule-prop-avail',
        column: 'G', // Column G is Status in Properties
        operator: 'equals',
        value: 'Available',
        applyTo: 'row',
        style: { bg: '#f0fdf4', color: '#166534' }
      }
    ]
  });

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ConditionalRule | null>(null);
  const [newRuleColumn, setNewRuleColumn] = useState('A');
  const [newRuleOperator, setNewRuleOperator] = useState<'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'>('equals');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleApplyTo, setNewRuleApplyTo] = useState<'cell' | 'row'>('row');
  const [newRuleBg, setNewRuleBg] = useState('');
  const [newRuleColor, setNewRuleColor] = useState('');
  const [newRuleBold, setNewRuleBold] = useState(false);
  const [newRuleItalic, setNewRuleItalic] = useState(false);

  // DATA VALIDATION ENGINE STATES & RULES
  const [validationRules, setValidationRules] = useState<{ [sheetId: string]: ValidationRule[] }>({
    leads: [
      {
        id: 'val-phone',
        column: 'C',
        type: 'phone',
        errorMessage: 'Invalid Phone Number format (e.g. +201001112233 or 01001112233)'
      },
      {
        id: 'val-deal-range',
        column: 'E',
        type: 'numeric_range',
        min: 10000,
        max: 500000000,
        errorMessage: 'Invalid Deal Value! Must be numeric range: EGP 10k - 500M'
      }
    ],
    properties: [
      {
        id: 'val-beds-range',
        column: 'D',
        type: 'numeric_range',
        min: 1,
        max: 15,
        errorMessage: 'Unrealistic Bedrooms count! Must be between 1 and 15'
      },
      {
        id: 'val-price-num',
        column: 'F',
        type: 'numeric',
        errorMessage: 'Requires positive numeric listing price'
      }
    ],
    campaigns: [
      {
        id: 'val-blasts-num',
        column: 'B',
        type: 'numeric',
        errorMessage: 'Sent count must be a numeric value'
      }
    ]
  });

  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [editingValidationRule, setEditingValidationRule] = useState<ValidationRule | null>(null);
  const [newValColumn, setNewValColumn] = useState('A');
  const [newValType, setNewValType] = useState<ValidationRuleType>('phone');
  const [newValMin, setNewValMin] = useState<number | ''>('');
  const [newValMax, setNewValMax] = useState<number | ''>('');
  const [newValError, setNewValError] = useState('');

  const clearValidationForm = () => {
    setNewValColumn('A');
    setNewValType('phone');
    setNewValMin('');
    setNewValMax('');
    setNewValError('');
    setEditingValidationRule(null);
  };

  const handleSaveValidationRule = () => {
    const errorMsg = newValError.trim() || getDefaultErrorMessage(newValType, newValMin, newValMax);
    const ruleObj: ValidationRule = {
      id: editingValidationRule ? editingValidationRule.id : 'val_' + Date.now(),
      column: newValColumn,
      type: newValType,
      min: newValType === 'numeric_range' && newValMin !== '' ? Number(newValMin) : undefined,
      max: newValType === 'numeric_range' && newValMax !== '' ? Number(newValMax) : undefined,
      errorMessage: errorMsg
    };

    setValidationRules(prev => {
      const activeRules = prev[activeSheetId] || [];
      const updatedRules = editingValidationRule
        ? activeRules.map(r => r.id === editingValidationRule.id ? ruleObj : r)
        : [...activeRules, ruleObj];

      return {
        ...prev,
        [activeSheetId]: updatedRules
      };
    });

    clearValidationForm();
  };

  const handleDeleteValidationRule = (id: string) => {
    setValidationRules(prev => ({
      ...prev,
      [activeSheetId]: (prev[activeSheetId] || []).filter(r => r.id !== id)
    }));
  };

  const handleStartEditValidationRule = (rule: ValidationRule) => {
    setEditingValidationRule(rule);
    setNewValColumn(rule.column);
    setNewValType(rule.type);
    setNewValMin(rule.min !== undefined ? rule.min : '');
    setNewValMax(rule.max !== undefined ? rule.max : '');
    setNewValError(rule.errorMessage || '');
  };

  const getDefaultErrorMessage = (type: ValidationRuleType, min?: number | '', max?: number | '') => {
    switch (type) {
      case 'phone': return 'Must be a valid phone number format';
      case 'numeric': return 'Must be a numeric value';
      case 'numeric_range': 
        if (min !== '' && max !== '') return `Must be a numeric range between ${min} and ${max}`;
        if (min !== '') return `Must be a numeric value at least ${min}`;
        if (max !== '') return `Must be a numeric value at most ${max}`;
        return 'Must be a valid numeric values';
      case 'email': return 'Must be a valid email format';
      case 'non_empty': return 'This cell cannot be empty';
      default: return 'Invalid cell entry format under rule guidelines';
    }
  };

  // Cell integrity logic execution
  const isCellValid = (ref: string, val: string, rules: ValidationRule[]): { isValid: boolean; error?: string } => {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return { isValid: true };
    const col = match[1].toUpperCase();
    const rowNum = parseInt(match[2]);

    // Don't validate header row (Row 1)
    if (rowNum === 1) return { isValid: true };

    const colRules = rules.filter(r => r.column.toUpperCase() === col);
    if (colRules.length === 0) return { isValid: true };

    const trimmedVal = val.trim();

    for (const rule of colRules) {
      if (rule.type === 'non_empty') {
        if (trimmedVal === '') {
          return { isValid: false, error: rule.errorMessage || 'Cannot be plain/blank empty' };
        }
      } else if (trimmedVal !== '') {
        if (rule.type === 'phone') {
          // Soft check: allow + and digits, clean formatting characters
          const cleanPhone = trimmedVal.replace(/[\s-()]/g, '');
          const phoneRegex = /^\+?[0-9]{7,15}$/;
          if (!phoneRegex.test(cleanPhone)) {
            return { isValid: false, error: rule.errorMessage || 'Must be a valid phone format with + digits' };
          }
        } else if (rule.type === 'numeric') {
          const valNum = parseFloat(trimmedVal.replace(/,/g, ''));
          if (isNaN(valNum)) {
            return { isValid: false, error: rule.errorMessage || 'Requires a valid numeric input' };
          }
        } else if (rule.type === 'numeric_range') {
          const valNum = parseFloat(trimmedVal.replace(/,/g, ''));
          if (isNaN(valNum)) {
            return { isValid: false, error: rule.errorMessage || 'Requires a valid numeric input' };
          }
          if (rule.min !== undefined && valNum < rule.min) {
            return { isValid: false, error: rule.errorMessage || `Value cannot be lower than ${rule.min.toLocaleString()}` };
          }
          if (rule.max !== undefined && valNum > rule.max) {
            return { isValid: false, error: rule.errorMessage || `Value cannot exceed ${rule.max.toLocaleString()}` };
          }
        } else if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedVal)) {
            return { isValid: false, error: rule.errorMessage || 'Requires typical email format (user@host.com)' };
          }
        }
      }
    }

    return { isValid: true };
  };

  // Initializing default spreadsheets on first mount
  useEffect(() => {
    // 1. Leads Tab matching CRM Data
    const initialLeads: SheetData = {
      "A1": { value: "Lead ID", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "B1": { value: "Full Name", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "C1": { value: "WhatsApp Phone", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "D1": { value: "Property Interest", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "E1": { value: "Deal Value (EGP)", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "F1": { value: "Lead Status", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "G1": { value: "Last Activity", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "H1": { value: "Notes", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
    };

    // Populate active CRM leads in Row 2-15
    propertyClients.forEach((client, idx) => {
      const row = idx + 2;
      initialLeads[`A${row}`] = { value: client.id };
      initialLeads[`B${row}`] = { value: client.name };
      initialLeads[`C${row}`] = { value: client.phone };
      initialLeads[`D${row}`] = { value: client.propertyInterest };
      initialLeads[`E${row}`] = { value: client.notes?.match(/([0-9]+)\s*M/i) ? (parseFloat(client.notes.match(/([0-9.]+)\s*M/i)?.[1] || '5') * 1000000).toString() : "6500000" };
      initialLeads[`F${row}`] = { value: client.status };
      initialLeads[`G${row}`] = { value: client.lastActivity };
      initialLeads[`H${row}`] = { value: client.notes || "Sourced from real campaign allocations." };
    });

    // Populate summary cell calculation
    const summaryRow = propertyClients.length + 3;
    initialLeads[`D${summaryRow}`] = { value: "Total Portfolio Active Worth:", style: { bold: true, align: 'right' } };
    initialLeads[`E${summaryRow}`] = { value: `=SUM(E2:E${summaryRow - 2})`, style: { bold: true, bg: '#f0fdf4', color: '#15803d' } };
    initialLeads[`D${summaryRow + 1}`] = { value: "Average Prospect Value:", style: { bold: true, align: 'right' } };
    initialLeads[`E${summaryRow + 1}`] = { value: `=AVERAGE(E2:E${summaryRow - 2})`, style: { bold: true, bg: '#eff6ff', color: '#1d4ed8' } };

    // 2. Properties Inventory Tab
    const initialProperties: SheetData = {
      "A1": { value: "Ref ID", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "B1": { value: "Compound Name", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "C1": { value: "Location District", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "D1": { value: "Bedrooms", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "E1": { value: "Size (sqm)", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "F1": { value: "Price (EGP)", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "G1": { value: "Status", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "H1": { value: "Owner Contact", style: { bold: true, align: 'center', bg: '#f1f5f9' } },

      "A2": { value: "MI-3B-21" }, "B2": { value: "Mivida New Cairo" }, "C2": { value: "Fifth Settlement" }, "D2": { value: "3" }, "E2": { value: "185" }, "F2": { value: "11500000" }, "G2": { value: "Available" }, "H2": { value: "Youssef Aly" },
      "A3": { value: "SOD-DU-4" }, "B3": { value: "Villette Marakez" }, "C3": { value: "New Cairo" }, "D3": { value: "4" }, "E3": { value: "240" }, "F3": { value: "18200000" }, "G3": { value: "Reserved" }, "H3": { value: "Farida Mansour" },
      "A4": { value: "MV-TH-6B" }, "B4": { value: "Mountain View iCity" }, "C4": { value: "6th of October" }, "D4": { value: "4" }, "E4": { value: "210" }, "F4": { value: "14800000" }, "G4": { value: "Available" }, "H4": { value: "Tarek Nour" },
      "A5": { value: "OPN-AP-1" }, "B5": { value: "One Ninety" }, "C5": { value: "New Cairo" }, "D5": { value: "2" }, "E5": { value: "125" }, "F5": { value: "9800000" }, "G5": { value: "Sold Out" }, "H5": { value: "Heba El Kady" },
      
      "C7": { value: "Total Compound Value:", style: { bold: true, align: 'right' } },
      "F7": { value: "=SUM(F2:F5)", style: { bold: true, bg: '#f0fdf4', color: '#166534' } },
      "C8": { value: "Average SQM Price:", style: { bold: true, align: 'right' } },
      "F8": { value: "=AVERAGE(F2:F5)", style: { bold: true, bg: '#eff6ff', color: '#1e40af' } },
    };

    // 3. Campaign Performance Tab
    const initialCampaigns: SheetData = {
      "A1": { value: "Campaign Name", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "B1": { value: "Total Blasts Sent", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "C1": { value: "Delivered Status", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "D1": { value: "Lead Replies", style: { bold: true, align: 'center', bg: '#f1f5f9' } },
      "E1": { value: "Conversion Rate (%)", style: { bold: true, align: 'center', bg: '#f1f5f9' } },

      "A2": { value: "New Cairo Launch Q2" }, "B2": { value: "150" }, "C2": { value: "142" }, "D2": { value: "48" }, "E2": { value: "0.32" },
      "A3": { value: "Mivida Luxury Penthouses" }, "B3": { value: "85" }, "C3": { value: "84" }, "D3": { value: "29" }, "E3": { value: "0.34" },
      "A4": { value: "October Villa Follow-up" }, "B4": { value: "110" }, "C4": { value: "95" }, "D4": { value: "15" }, "E4": { value: "0.14" },

      "A6": { value: "Total WhatsApp Reach:", style: { bold: true, align: 'right' } },
      "B6": { value: "=SUM(B2:B4)" }, "C6": { value: "=SUM(C2:C4)" }, "D6": { value: "=SUM(D2:D4)" },
    };

    setSheets([
      { id: 'leads', name: 'Property CRM Leads', data: initialLeads, headers: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], rowCount: 30 },
      { id: 'properties', name: 'Property Catalog', data: initialProperties, headers: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], rowCount: 30 },
      { id: 'campaigns', name: 'WA Campaigns Stats', data: initialCampaigns, headers: ["A", "B", "C", "D", "E", "F", "G", "H"], rowCount: 25 },
    ]);
  }, [propertyClients]);

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  if (!sheets.length) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Column Index utilities (A=1, B=2...)
  const colToLetter = (colIdx: number) => {
    let col = '';
    let temp = colIdx;
    while (temp > 0) {
      let r = (temp - 1) % 26;
      col = String.fromCharCode(65 + r) + col;
      temp = Math.floor((temp - r) / 26);
    }
    return col;
  };

  const letterToCol = (letter: string) => {
    let idx = 0;
    for (let i = 0; i < letter.length; i++) {
      idx = idx * 26 + (letter.charCodeAt(i) - 64);
    }
    return idx;
  };

  // Helper to parse cell reference like "E5" -> { row: 5, col: 5 }
  const parseCellRef = (ref: string): { row: number; col: number } | null => {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    return {
      row: parseInt(match[2]),
      col: letterToCol(match[1].toUpperCase())
    };
  };

  // EXCEL FORMULAS EVALUATION ENGINE //
  const evaluateCell = (
    ref: string, 
    rawVal: string, 
    sheetData: SheetData, 
    visited = new Set<string>()
  ): string => {
    if (!rawVal) return '';
    if (!rawVal.startsWith('=')) return rawVal;
    if (visited.has(ref)) return "#REF!"; // Circular dependency safeguard
    
    visited.add(ref);
    const formula = rawVal.substring(1).trim();
    
    try {
      // 1. Core aggregations with Ranges, e.g. SUM(E2:E14)
      const rangeMatch = formula.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
      if (rangeMatch) {
        const [_, op, startColL, startRowStr, endColL, endRowStr] = rangeMatch;
        const opUpper = op.toUpperCase();
        
        const startCol = letterToCol(startColL.toUpperCase());
        const endCol = letterToCol(endColL.toUpperCase());
        const startRow = parseInt(startRowStr);
        const endRow = parseInt(endRowStr);
        
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        
        const numericValues: number[] = [];
        
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const currentRef = `${colToLetter(c)}${r}`;
            const targetCell = sheetData[currentRef];
            const raw = targetCell ? targetCell.value : '';
            // Evaluate nested cell
            const evaled = evaluateCell(currentRef, raw, sheetData, new Set(visited));
            const parsed = parseFloat(evaled);
            if (!isNaN(parsed)) {
              numericValues.push(parsed);
            }
          }
        }
        
        if (opUpper === 'SUM') {
          return numericValues.reduce((sum, v) => sum + v, 0).toString();
        }
        if (opUpper === 'AVERAGE') {
          return numericValues.length > 0 
            ? (numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length).toFixed(0)
            : '0';
        }
        if (opUpper === 'MIN') {
          return numericValues.length > 0 ? Math.min(...numericValues).toString() : '0';
        }
        if (opUpper === 'MAX') {
          return numericValues.length > 0 ? Math.max(...numericValues).toString() : '0';
        }
        if (opUpper === 'COUNT') {
          return numericValues.length.toString();
        }
      }
      
      // 2. Singular cell filters (UPPER, LOWER)
      const singleOpMatch = formula.match(/^(UPPER|LOWER)\(([A-Z]+\d+)\)$/i);
      if (singleOpMatch) {
        const [_, op, targetRef] = singleOpMatch;
        const targetCell = sheetData[targetRef.toUpperCase()];
        const raw = targetCell ? targetCell.value : '';
        const evaluated = evaluateCell(targetRef.toUpperCase(), raw, sheetData, new Set(visited));
        return op.toUpperCase() === 'UPPER' ? evaluated.toUpperCase() : evaluated.toLowerCase();
      }

      // 3. String concatenation CONCAT(B2, " - ", D2)
      const concatMatch = formula.match(/^CONCAT\s*\(\s*([A-Z]+\d+)\s*,\s*([A-Z]+\d+)\s*\)$/i);
      if (concatMatch) {
        const [_, ref1, ref2] = concatMatch;
        const v1 = sheetData[ref1.toUpperCase()] ? evaluateCell(ref1.toUpperCase(), sheetData[ref1.toUpperCase()].value, sheetData, new Set(visited)) : '';
        const v2 = sheetData[ref2.toUpperCase()] ? evaluateCell(ref2.toUpperCase(), sheetData[ref2.toUpperCase()].value, sheetData, new Set(visited)) : '';
        return v1 + " " + v2;
      }

      // 4. Direct reference e.g., =E10
      const directRefMatch = formula.match(/^([A-Z]+\d+)$/i);
      if (directRefMatch) {
        const targetRef = directRefMatch[1].toUpperCase();
        const targetCell = sheetData[targetRef];
        if (!targetCell) return '';
        return evaluateCell(targetRef, targetCell.value, sheetData, new Set(visited));
      }
      
      // 5. Basic arithmetic calculation support safely (e.g., =1200*1.1)
      if (/^[0-9+\-*/().\s]+$/.test(formula)) {
        try {
          const result = new Function(`return (${formula})`)();
          return typeof result === 'number' && !isNaN(result) ? result.toString() : '#VALUE!';
        } catch {
          return '#VALUE!';
        }
      }
      
      return '#NAME?';
    } catch {
      return '#ERR!';
    }
  };

  // Get current visual cell value representation
  const getCellDisplayValue = (ref: string, sheetData: SheetData) => {
    const cellValueObj = sheetData[ref];
    if (!cellValueObj) return '';
    if (cellValueObj.value.startsWith('=')) {
      return evaluateCell(ref, cellValueObj.value, sheetData);
    }
    return cellValueObj.value;
  };

  // Check if cell matches active search
  const cellMatchesSearch = (ref: string, val: string) => {
    if (!searchQuery) return false;
    const lowerVal = val.toLowerCase();
    const query = searchQuery.toLowerCase();
    return lowerVal.includes(query) || ref.toLowerCase() === query;
  };

  // Selection Box Helpers
  const isSelected = (row: number, col: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  };

  // Range Statistics calculation for the active bottom bar
  const calculateSelectionStats = () => {
    if (!selectionStart || !selectionEnd) return null;
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    let sum = 0;
    let count = 0;
    let numCount = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colToLetter(c)}${r}`;
        const val = getCellDisplayValue(ref, activeSheet.data);
        count++;
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) {
          numCount++;
          sum += parsed;
          if (parsed < min) min = parsed;
          if (parsed > max) max = parsed;
        }
      }
    }

    return {
      sum: numCount > 0 ? sum : 0,
      count,
      avg: numCount > 0 ? (sum / numCount).toFixed(0) : '0',
      min: numCount > 0 ? min : 0,
      max: numCount > 0 ? max : 0,
      hasNumbers: numCount > 0,
      rangeLabel: `${colToLetter(minC)}${minR}:${colToLetter(maxC)}${maxR}`
    };
  };

  const stats = calculateSelectionStats();

  // Mouse Interactivity handlers (Excel selection box drag)
  const handleCellMouseDown = (row: number, col: number) => {
    setActiveCell({ row, col });
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
    setIsMouseDown(true);
    setIsEditing(false);
    
    const ref = `${colToLetter(col)}${row}`;
    const cellValueObj = activeSheet.data[ref];
    setEditValue(cellValueObj ? cellValueObj.value : '');
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isMouseDown) {
      setSelectionEnd({ row, col });
    }
  };

  const handleCellMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setActiveCell({ row, col });
    setIsEditing(true);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  // Keyboard navigation on spreadsheet grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const { row, col } = activeCell;
      let nextRow = row;
      let nextCol = col;

      if (e.key === 'ArrowUp') {
        nextRow = Math.max(1, row - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        nextRow = Math.min(activeSheet.rowCount, row + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        nextCol = Math.max(1, col - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        nextCol = Math.min(activeSheet.headers.length, col + 1);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 50);
        e.preventDefault();
        return;
      } else if (e.key === 'Tab') {
        nextCol = Math.min(activeSheet.headers.length, col + 1);
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        updateCellData(row, col, '');
        e.preventDefault();
        return;
      } else {
        return;
      }

      setActiveCell({ row: nextRow, col: nextCol });
      if (!e.shiftKey) {
        setSelectionStart({ row: nextRow, col: nextCol });
        setSelectionEnd({ row: nextRow, col: nextCol });
        
        const nextRef = `${colToLetter(nextCol)}${nextRow}`;
        const cellValueObj = activeSheet.data[nextRef];
        setEditValue(cellValueObj ? cellValueObj.value : '');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, isEditing, activeSheet]);

  // Updating specific cell content
  const updateCellData = (row: number, col: number, newValue: string, changes?: Partial<CellStyle>) => {
    const cellRef = `${colToLetter(col)}${row}`;
    
    setSheets(prevSheets => prevSheets.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      
      const currentCell = sh.data[cellRef] || { value: '' };
      const updatedStyle = changes ? { ...(currentCell.style || {}), ...changes } : currentCell.style;
      
      return {
        ...sh,
        data: {
          ...sh.data,
          [cellRef]: {
            value: newValue !== undefined ? newValue : currentCell.value,
            style: updatedStyle
          }
        }
      };
    }));

    if (newValue !== undefined) {
      setEditValue(newValue);
    }
  };

  const applyActiveCellStyle = (styleUpdate: Partial<CellStyle>) => {
    if (!selectionStart || !selectionEnd) return;
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    setSheets(prevSheets => prevSheets.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      const updatedData = { ...sh.data };
      
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const ref = `${colToLetter(c)}${r}`;
          const currentCell = updatedData[ref] || { value: '' };
          updatedData[ref] = {
            ...currentCell,
            style: {
              ...(currentCell.style || {}),
              ...styleUpdate
            }
          };
        }
      }
      return { ...sh, data: updatedData };
    }));
  };

  // Column / Row management
  const handleAddRow = () => {
    setSheets(prev => prev.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      return { ...sh, rowCount: sh.rowCount + 5 };
    }));
  };

  const handleAddColumn = () => {
    setSheets(prev => prev.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      const nextLetter = colToLetter(sh.headers.length + 1);
      return { ...sh, headers: [...sh.headers, nextLetter] };
    }));
  };

  const handleDeleteRow = () => {
    const targetRow = activeCell.row;
    setSheets(prev => prev.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      
      const nextData: SheetData = {};
      Object.keys(sh.data).forEach(ref => {
        const parsed = parseCellRef(ref);
        if (!parsed) return;
        if (parsed.row === targetRow) return; // omit this row
        
        if (parsed.row > targetRow) {
          // decrement subsequent row coordinates
          nextData[`${colToLetter(parsed.col)}${parsed.row - 1}`] = sh.data[ref];
        } else {
          nextData[ref] = sh.data[ref];
        }
      });

      return {
        ...sh,
        data: nextData,
        rowCount: Math.max(10, sh.rowCount - 1)
      };
    }));
    setActiveCell(p => ({ ...p, row: Math.max(1, p.row - 1) }));
  };

  // COLUMN SORTING COMPONENT //
  const handleSortColumnCommand = (direction: 'asc' | 'desc') => {
    const colIdx = activeCell.col;
    const headerLetter = colToLetter(colIdx);
    
    // Sort starting from row 2
    const rowsToSort: { rowIdx: number; val: string; dataRow: any }[] = [];
    // Iterate to find rows with data
    for (let r = 2; r <= activeSheet.rowCount; r++) {
      const cellRef = `${headerLetter}${r}`;
      const dispVal = getCellDisplayValue(cellRef, activeSheet.data);
      // store the whole row's cell data
      const wholeRowData: { [col: string]: CellData } = {};
      activeSheet.headers.forEach((h, hIdx) => {
        const lookup = `${h}${r}`;
        if (activeSheet.data[lookup]) {
          wholeRowData[h] = activeSheet.data[lookup];
        }
      });
      rowsToSort.push({ rowIdx: r, val: dispVal, dataRow: wholeRowData });
    }

    // Sort rows sorting array
    rowsToSort.sort((a, b) => {
      const numA = parseFloat(a.val);
      const numB = parseFloat(b.val);
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc' ? a.val.localeCompare(b.val) : b.val.localeCompare(a.val);
    });

    setSheets(prev => prev.map(sh => {
      if (sh.id !== activeSheetId) return sh;
      const nextData = { ...sh.data };
      
      // Clean previous fields in rows >= 2
      for (let r = 2; r <= sh.rowCount; r++) {
        sh.headers.forEach(h => {
          delete nextData[`${h}${r}`];
        });
      }

      // Re-populate in sorted index
      rowsToSort.forEach((sortedRow, idx) => {
        const targetRow = idx + 2;
        Object.keys(sortedRow.dataRow).forEach(h => {
          nextData[`${h}${targetRow}`] = sortedRow.dataRow[h];
        });
      });

      return { ...sh, data: nextData };
    }));
  };

  // EXPORT EXCEL TO CSV //
  const handleExportCSV = () => {
    let csvContent = "";
    
    // Get headers
    const cols = activeSheet.headers;
    // We export rows until rowCount
    for (let r = 1; r <= activeSheet.rowCount; r++) {
      const rowValues = cols.map(c => {
        const ref = `${c}${r}`;
        const val = getCellDisplayValue(ref, activeSheet.data);
        // format values containing commas
        if (val.includes(',') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      // Check if row is empty to truncate exports
      if (rowValues.every(v => v === '')) continue;
      csvContent += rowValues.join(",") + "\n";
    }

    if (!csvContent) {
      alert("No data to export!");
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeSheet.name.replace(/\s+/g, '_')}_Sierra estates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PARSE IMPORTED CSV //
  const handleApplyCSVImport = () => {
    if (!importCsvRaw.trim()) {
      alert("Please paste some CSV content first.");
      return;
    }

    const rows = importCsvRaw.split('\n').map(row => {
      // Split on comma, taking double quotes into account
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (matches) {
        return matches.map(val => val.replace(/^"|"$/g, ''));
      }
      return row.split(',');
    });

    const parsedSheetData: SheetData = {};
    let maxCols = 10;

    rows.forEach((rowCells, rIdx) => {
      const row = rIdx + 1;
      maxCols = Math.max(maxCols, rowCells.length);
      rowCells.forEach((cellVal, cIdx) => {
        const colLetter = colToLetter(cIdx + 1);
        const style = rIdx === 0 ? { bold: true, align: 'center' as const, bg: '#f1f5f9' } : undefined;
        parsedSheetData[`${colLetter}${row}`] = {
          value: cellVal.trim(),
          style
        };
      });
    });

    const colHeaders = Array.from({ length: Math.min(26, maxCols) }, (_, i) => colToLetter(i + 1));

    if (importTargetTab === 'new') {
      const newId = 'sheet_' + Date.now();
      const newSheet: SheetInfo = {
        id: newId,
        name: `Imported Tab ${sheets.length + 1}`,
        data: parsedSheetData,
        headers: colHeaders,
        rowCount: Math.max(30, rows.length + 5)
      };
      setSheets([...sheets, newSheet]);
      setActiveSheetId(newId);
    } else {
      // replace active tab
      setSheets(prev => prev.map(sh => {
        if (sh.id !== activeSheetId) return sh;
        return {
          ...sh,
          data: parsedSheetData,
          headers: colHeaders,
          rowCount: Math.max(30, rows.length + 5)
        };
      }));
    }

    setIsImportModalOpen(false);
    setImportCsvRaw('');
  };

  // CRM DATABASE SYNCHRONIZATION VIEW //
  const handleSyncToCRM = async () => {
    // 1. Run Data Validation engine pre-check on active sheet
    const activeRules = validationRules[activeSheetId] || [];
    let invalidCellsFound: { ref: string; row: number; error: string; val: string }[] = [];

    // Let's sweep all non-empty rows that are being synchronized
    for (let r = 2; r <= activeSheet.rowCount; r++) {
      const nameRef = `B${r}`;
      const phoneRef = `C${r}`;
      const nameValue = getCellDisplayValue(nameRef, activeSheet.data).trim();
      const phoneValue = getCellDisplayValue(phoneRef, activeSheet.data).trim();

      // If the row has data that would be synchronized (e.g. name or phone are provided)
      if (nameValue || phoneValue) {
        // Validate columns under active sheet rules
        activeRules.forEach(rule => {
          const ref = `${rule.column}${r}`;
          const val = getCellDisplayValue(ref, activeSheet.data);
          const validationResult = isCellValid(ref, val, activeRules);
          if (!validationResult.isValid) {
            invalidCellsFound.push({
              ref,
              row: r,
              error: validationResult.error || 'Validation error',
              val
            });
          }
        });
      }
    }

    if (invalidCellsFound.length > 0) {
      // Build details about the validation errors
      const errorStrings = invalidCellsFound.slice(0, 3).map(err => 
        `• Cell ${err.ref}: "${err.val}" - ${err.error}`
      ).join('\n');
      const moreText = invalidCellsFound.length > 3 ? `\n...and ${invalidCellsFound.length - 3} more errors.` : '';

      const confirmMessage = `WARNING: Data Validation Engine detected ${invalidCellsFound.length} invalid entries!\n\n` +
        `Examples of rules violated:\n${errorStrings}${moreText}\n\n` +
        `Data integrity is critical for Sierra Estates. Syncing invalid contacts or pricing details can corrupt your active CRM workflows.\n\n` +
        `Do you want to ignore validation rules and SYNC ANYWAY?\n(Click OK to sync regardless, or Cancel to abort and review highlighted cells in red)`;

      const proceed = window.confirm(confirmMessage);
      if (!proceed) {
        setIsSyncingCRM(false);
        setCrmSyncMessage('CRM Sync aborted. Please correct the highlighted red cells.');
        return;
      }
    }

    setIsSyncingCRM(true);
    setCrmSyncMessage('Reading spreadsheet cells and updating local CRM Leads Registry...');
    
    try {
      await new Promise(res => setTimeout(res, 1200)); // nice realistic loading
      
      const newClients: PropertyClientRecord[] = [];
      const updatedClients = [...propertyClients];
      
      // Let's iterate rows from 2 on search of name / phone properties
      for (let r = 2; r <= activeSheet.rowCount; r++) {
        // Find cells mapped as: A=ID, B=Name, C=Phone, D=Property, E=Price, F=Status, G=Activity, H=Notes
        const idRef = `A${r}`;
        const nameRef = `B${r}`;
        const phoneRef = `C${r}`;
        const propRef = `D${r}`;
        const priceRef = `E${r}`;
        const statusRef = `F${r}`;
        const actRef = `G${r}`;
        const notesRef = `H${r}`;

        const nameValue = getCellDisplayValue(nameRef, activeSheet.data).trim();
        const phoneValue = getCellDisplayValue(phoneRef, activeSheet.data).trim();
        
        if (!nameValue || !phoneValue) continue; // skip incomplete elements

        const crmId = getCellDisplayValue(idRef, activeSheet.data).trim() || 'pc-' + (Date.now() + r);
        const propertyInt = getCellDisplayValue(propRef, activeSheet.data) || 'Mivida Compound';
        const dealVal = getCellDisplayValue(priceRef, activeSheet.data);
        const statusVal = getCellDisplayValue(statusRef, activeSheet.data) as any;
        const notesVal = getCellDisplayValue(notesRef, activeSheet.data);
        
        const validStatuses = ['New Lead', 'WhatsApp Contacted', 'Tour Arranged', 'Under Offer', 'Closed Sold', 'No Answer'];
        const validatedStatus = validStatuses.includes(statusVal) ? statusVal : 'New Lead';

        const clientObj: PropertyClientRecord = {
          id: crmId,
          name: nameValue,
          phone: phoneValue,
          propertyInterest: propertyInt,
          status: validatedStatus,
          lastActivity: getCellDisplayValue(actRef, activeSheet.data) || 'Spreadsheet bulk imported',
          notes: notesVal || `Active Deal: EGP ${dealVal || '6.5M'}`,
          updatedAt: new Date().toLocaleString()
        };

        const existingIdx = updatedClients.findIndex(c => c.id === crmId || c.phone === phoneValue);
        if (existingIdx >= 0) {
          updatedClients[existingIdx] = clientObj;
        } else {
          updatedClients.unshift(clientObj);
        }
      }

      onUpdatePropertyClients(updatedClients);
      setCrmSyncMessage('CRM Synchronized successfully! WhatsApp Simulators and pipelines are instantly up to date.');
    } catch (e: any) {
      setCrmSyncMessage(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncingCRM(false);
      setTimeout(() => setCrmSyncMessage(''), 5000);
    }
  };

  // GEMINI CO-PILOT ASSISTED DATA SYNTHESIS & ENDPOINT //
  const handleTriggerCopilot = async () => {
    if (!copilotPrompt.trim()) return;

    const userMsg = copilotPrompt.trim();
    setCopilotHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setCopilotPrompt('');
    setIsCopilotLoading(true);

    try {
      // Determine if they are asking to generate tabular sheet data or just analyze
      const lowercasePrompt = userMsg.toLowerCase();
      const isGenerateMode = lowercasePrompt.includes("generate") || lowercasePrompt.includes("create sheet") || lowercasePrompt.includes("list Egyptian") || lowercasePrompt.includes("synthesize");

      const res = await fetch("/api/gemini/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: isGenerateMode ? "generate" : "analyze",
          prompt: userMsg,
          spreadsheetData: {
            sheetName: activeSheet.name,
            cells: Object.keys(activeSheet.data).reduce((acc: any, key) => {
              acc[key] = {
                input: activeSheet.data[key].value,
                display: getCellDisplayValue(key, activeSheet.data)
              };
              return acc;
            }, {})
          }
        })
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with AI endpoint.");
      }

      const data = await res.json();

      if (isGenerateMode && data.rows) {
        // AI generated a spreadsheet! Let's insert into current active cell starting point
        const activeR = activeCell.row;
        const activeC = activeCell.col;
        
        setSheets(prev => prev.map(sh => {
          if (sh.id !== activeSheetId) return sh;
          const nextData = { ...sh.data };
          
          // Insert headers if configured in prompt
          if (data.headers && activeR === 1) {
            data.headers.forEach((hdr: string, hIdx: number) => {
              const targetCol = colToLetter(activeC + hIdx);
              nextData[`${targetCol}1`] = { value: hdr, style: { bold: true, bg: '#f1f5f9', align: 'center' } };
            });
          }

          // Insert rows
          data.rows.forEach((rowCells: any[], rIdx: number) => {
            const targetRow = activeR + (activeR === 1 ? rIdx + 1 : rIdx);
            rowCells.forEach((val: any, cIdx: number) => {
              const targetCol = colToLetter(activeC + cIdx);
              nextData[`${targetCol}${targetRow}`] = { value: String(val) };
            });
          });

          return { ...sh, data: nextData };
        }));

        setCopilotHistory(prev => [...prev, { 
          role: 'assistant', 
          text: `🎯 Successfully synthesized **${data.title || 'tabular data'}**! Generated ${data.rows.length} rows directly starting into cell **${colToLetter(activeC)}${activeR}**.` 
        }]);

      } else {
        // AI returned analytical report
        setCopilotHistory(prev => [...prev, { role: 'assistant', text: data.text || "I processed that request successfully." }]);
      }
    } catch (e: any) {
      setCopilotHistory(prev => [...prev, { role: 'assistant', text: `Error processing copilot: ${e.message || e}` }]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Pre-configured Excel Copilot quick buttons to let users trigger quickly
  const handleQuickCopilotAction = (actionText: string) => {
    setCopilotPrompt(actionText);
  };

  // CONDITIONAL FORMATTING LOGIC & HELPERS //
  const parseRuleValueStr = (val: string): number => {
    let clean = val.toUpperCase().trim();
    if (clean.endsWith('M')) {
      const num = parseFloat(clean.substring(0, clean.length - 1));
      if (!isNaN(num)) return num * 1000000;
    }
    if (clean.endsWith('K')) {
      const num = parseFloat(clean.substring(0, clean.length - 1));
      if (!isNaN(num)) return num * 1000;
    }
    // strip standard units like EGP, %, spaces and commas
    const filtered = clean.replace(/[^0-9.-]/g, '');
    const num = parseFloat(filtered);
    return isNaN(num) ? NaN : num;
  };

  const evaluateRuleCondition = (cellValue: string, operator: string, ruleValue: string): boolean => {
    if (cellValue === undefined || cellValue === null) return false;

    const sVal = cellValue.toLowerCase().trim();
    const sRuleVal = ruleValue.toLowerCase().trim();

    const valNum = parseRuleValueStr(cellValue);
    const ruleValNum = parseRuleValueStr(ruleValue);
    const isNumeric = !isNaN(valNum) && !isNaN(ruleValNum);

    switch (operator) {
      case 'equals':
        return sVal === sRuleVal;
      case 'not_equals':
        return sVal !== sRuleVal;
      case 'contains':
        return sVal.includes(sRuleVal);
      case 'greater_than':
        if (isNumeric) return valNum > ruleValNum;
        return sVal > sRuleVal;
      case 'less_than':
        if (isNumeric) return valNum < ruleValNum;
        return sVal < sRuleVal;
      default:
        return false;
    }
  };

  const getCellStyles = (row: number, colLetter: string, baseStyle?: CellStyle) => {
    let fgColor = baseStyle?.color || undefined;
    let bgColor = baseStyle?.bg || undefined;
    let isBold = baseStyle?.bold || false;
    let isItalic = baseStyle?.italic || false;
    let isUnderline = baseStyle?.underline || false;
    let isStrikethrough = baseStyle?.strikethrough || false;

    const rules = conditionalRules[activeSheetId] || [];

    rules.forEach(rule => {
      let matches = false;

      if (rule.applyTo === 'row') {
        const checkRef = `${rule.column}${row}`;
        const checkVal = getCellDisplayValue(checkRef, activeSheet.data);
        if (evaluateRuleCondition(checkVal, rule.operator, rule.value)) {
          matches = true;
        }
      } else {
        if (colLetter === rule.column) {
          const checkRef = `${colLetter}${row}`;
          const checkVal = getCellDisplayValue(checkRef, activeSheet.data);
          if (evaluateRuleCondition(checkVal, rule.operator, rule.value)) {
            matches = true;
          }
        }
      }

      if (matches) {
        if (rule.style.bg) bgColor = rule.style.bg;
        if (rule.style.color) fgColor = rule.style.color;
        if (rule.style.bold !== undefined) isBold = isBold || rule.style.bold;
        if (rule.style.italic !== undefined) isItalic = isItalic || rule.style.italic;
      }
    });

    return {
      fontWeight: isBold ? 'bold' as const : 'normal' as const,
      fontStyle: isItalic ? 'italic' as const : 'normal' as const,
      textDecoration: `${isUnderline ? 'underline' : ''} ${isStrikethrough ? 'line-through' : ''}`,
      justifyContent: baseStyle?.align === 'center' ? 'center' as const : baseStyle?.align === 'right' ? 'flex-end' : 'flex-start',
      color: fgColor,
      backgroundColor: bgColor
    };
  };

  const clearRuleForm = () => {
    setNewRuleColumn('A');
    setNewRuleOperator('equals');
    setNewRuleValue('');
    setNewRuleApplyTo('row');
    setNewRuleBg('');
    setNewRuleColor('');
    setNewRuleBold(false);
    setNewRuleItalic(false);
  };

  const startEditRule = (rule: ConditionalRule) => {
    setEditingRule(rule);
    setNewRuleColumn(rule.column);
    setNewRuleOperator(rule.operator);
    setNewRuleValue(rule.value);
    setNewRuleApplyTo(rule.applyTo);
    setNewRuleBg(rule.style.bg || '');
    setNewRuleColor(rule.style.color || '');
    setNewRuleBold(rule.style.bold || false);
    setNewRuleItalic(rule.style.italic || false);
  };

  const handleSaveRule = () => {
    if (!newRuleValue.trim()) {
      alert("Please enter a comparison value.");
      return;
    }

    const ruleObj: ConditionalRule = {
      id: editingRule ? editingRule.id : 'rule_' + Date.now(),
      column: newRuleColumn,
      operator: newRuleOperator,
      value: newRuleValue,
      applyTo: newRuleApplyTo,
      style: {
        bg: newRuleBg || undefined,
        color: newRuleColor || undefined,
        bold: newRuleBold ? true : undefined,
        italic: newRuleItalic ? true : undefined,
      }
    };

    setConditionalRules(prev => {
      const activeRules = prev[activeSheetId] || [];
      const updatedRules = editingRule
        ? activeRules.map(r => r.id === editingRule.id ? ruleObj : r)
        : [...activeRules, ruleObj];

      return {
        ...prev,
        [activeSheetId]: updatedRules
      };
    });

    setEditingRule(null);
    clearRuleForm();
  };

  const handleDeleteRule = (id: string) => {
    setConditionalRules(prev => {
      const activeRules = prev[activeSheetId] || [];
      return {
        ...prev,
        [activeSheetId]: activeRules.filter(r => r.id !== id)
      };
    });
    if (editingRule && editingRule.id === id) {
      setEditingRule(null);
      clearRuleForm();
    }
  };

  const applySavedTemplateRule = (tmpl: Omit<ConditionalRule, 'id'>) => {
    const ruleObj: ConditionalRule = {
      ...tmpl,
      id: 'rule_tmpl_' + Date.now() + Math.floor(Math.random() * 1000)
    };
    setConditionalRules(prev => {
      const activeRules = prev[activeSheetId] || [];
      return {
        ...prev,
        [activeSheetId]: [...activeRules, ruleObj]
      };
    });
  };

  const getOperatorSymbol = (op: string) => {
    switch (op) {
      case 'equals': return 'is exactly equal to';
      case 'not_equals': return 'is NOT equal to';
      case 'contains': return 'contains';
      case 'greater_than': return 'is greater than (>)';
      case 'less_than': return 'is less than (<)';
      default: return op;
    }
  };

  return (
    <div id="excel-skill-workbench" className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden text-slate-800 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 font-sans">Sierra Estates Interactive Sheets 3.0</h4>
            <p className="text-[10px] text-slate-400 font-sans">CRM Data Pipeline & Formulas Engine</p>
          </div>
        </div>

        {/* Action Button Suite */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-white text-slate-600 border border-slate-200 p-1.5 px-3 rounded-lg hover:border-slate-300 font-bold transition-colors cursor-pointer"
          >
            <Upload size={13} />
            Import CSV
          </button>
          
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs bg-white text-slate-600 border border-slate-200 p-1.5 px-3 rounded-lg hover:border-slate-300 font-bold transition-colors cursor-pointer"
          >
            <Download size={13} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 p-1.5 px-3 rounded-lg hover:bg-amber-100 font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles size={13} className="text-amber-500" />
            Formatting Rules ({(conditionalRules[activeSheetId] || []).length})
          </button>

          <button
            type="button"
            onClick={() => {
              setIsValidationModalOpen(true);
              clearValidationForm();
            }}
            className="flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 p-1.5 px-3 rounded-lg hover:bg-rose-100 font-bold transition-colors cursor-pointer shadow-sm animate-pulse"
            title="Maintain spreadsheet column types and ranges validations"
          >
            <ShieldCheck size={13} className="text-rose-500" />
            Validation Rules ({(validationRules[activeSheetId] || []).length})
          </button>

          <button
            type="button"
            onClick={handleSyncToCRM}
            disabled={isSyncingCRM}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white p-1.5 px-3 rounded-lg hover:bg-emerald-700 font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-45"
          >
            <Database size={13} />
            {isSyncingCRM ? "Syncing..." : "Sync Sheet to CRM"}
          </button>
        </div>
      </div>

      {/* 2. EXCEL RIBBON BAR & SEARCH */}
      <div className="border-b border-slate-200 bg-white p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        
        {/* Style Formatters */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
          <button
            title="Bold text"
            onClick={() => applyActiveCellStyle({ bold: !activeSheet.data[`${colToLetter(activeCell.col)}${activeCell.row}`]?.style?.bold })}
            className={`p-1.5 px-2.5 rounded hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer`}
          >
            <Bold size={13} />
          </button>
          <button
            title="Italic text"
            onClick={() => applyActiveCellStyle({ italic: !activeSheet.data[`${colToLetter(activeCell.col)}${activeCell.row}`]?.style?.italic })}
            className="p-1.5 px-2.5 rounded hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Italic size={13} />
          </button>
          <button
            title="Underline text"
            onClick={() => applyActiveCellStyle({ underline: !activeSheet.data[`${colToLetter(activeCell.col)}${activeCell.row}`]?.style?.underline })}
            className="p-1.5 px-2.5 rounded hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Underline size={13} />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <button
            title="Align Left"
            onClick={() => applyActiveCellStyle({ align: 'left' })}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <AlignLeft size={13} />
          </button>
          <button
            title="Align Center"
            onClick={() => applyActiveCellStyle({ align: 'center' })}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <AlignCenter size={13} />
          </button>
          <button
            title="Align Right"
            onClick={() => applyActiveCellStyle({ align: 'right' })}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <AlignRight size={13} />
          </button>
        </div>

        {/* Color Palette selectors */}
        <div className="flex items-center gap-2">
          {/* Fills */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Shading:</span>
            <div className="flex items-center gap-0.5">
              {['#ffffff', '#f1f5f9', '#fef08a', '#dcfce7', '#dbeafe'].map(color => (
                <button
                  key={color}
                  onClick={() => applyActiveCellStyle({ bg: color })}
                  className="w-4 h-4 rounded border border-slate-200 cursor-pointer"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Text:</span>
            <div className="flex items-center gap-0.5">
              {['#1e293b', '#ef4444', '#15803d', '#1d4ed8', '#7c3aed'].map(color => (
                <button
                  key={color}
                  onClick={() => applyActiveCellStyle({ color: color })}
                  className="w-4 h-4 rounded border border-slate-200 cursor-pointer flex items-center justify-center font-bold text-[9px]"
                  style={{ color: color }}
                >
                  T
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column mutations */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-0.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200 p-1 px-2.5 rounded hover:bg-slate-100 font-bold transition cursor-pointer"
          >
            <Plus size={10} />
            +Row
          </button>
          <button
            onClick={handleAddColumn}
            className="flex items-center gap-0.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200 p-1 px-2.5 rounded hover:bg-slate-100 font-bold transition cursor-pointer"
          >
            <Plus size={10} />
            +Col
          </button>
          <button
            onClick={handleDeleteRow}
            className="flex items-center gap-0.5 text-[10px] bg-rose-50 text-rose-600 border border-rose-100 p-1 px-2.5 rounded hover:bg-rose-100 font-bold transition cursor-pointer"
          >
            <Trash2 size={10} />
            Delete Row
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Excel sheet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-1 px-2.5 pl-7 bg-slate-50 border border-slate-200 text-xs rounded-lg w-40 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-sans text-slate-700"
          />
        </div>
      </div>

      {/* 3. EXCEL FORMULA BAR */}
      <div className="bg-slate-50 border-b border-slate-200 p-1 px-3 flex items-center gap-2 shrink-0">
        <div className="bg-white border border-slate-300 font-semibold p-1 px-2.5 rounded text-xs font-mono text-indigo-700 select-none w-14 text-center">
          {colToLetter(activeCell.col)}{activeCell.row}
        </div>
        <div className="text-slate-400 text-xs select-none">fx</div>
        <div className="flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              updateCellData(activeCell.row, activeCell.col, e.target.value);
            }}
            placeholder="Enter values or Excel formulas (e.g. =SUM(E2:E6), =AVERAGE(D3:D4), =UPPER(B2))"
            className="w-full p-1 px-3 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Sort triggers */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSortColumnCommand('asc')}
            title="Sort Column A-Z"
            className="p-1 text-[11px] font-bold border border-slate-200 hover:bg-white bg-slate-100 rounded text-slate-600 cursor-pointer transition flex items-center gap-0.5 whitespace-nowrap"
          >
            <ArrowUpDown size={11} />
            A-Z
          </button>
          <button
            onClick={() => handleSortColumnCommand('desc')}
            title="Sort Column Z-A"
            className="p-1 text-[11px] font-bold border border-slate-200 hover:bg-white bg-slate-100 rounded text-slate-600 cursor-pointer transition flex items-center gap-0.5 whitespace-nowrap"
          >
            <ArrowUpDown size={11} />
            Z-A
          </button>
        </div>
      </div>

      {/* CRM MESSAGE SUCCESS TOAST */}
      {crmSyncMessage && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-100 p-2.5 text-xs flex items-center justify-between font-medium font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{crmSyncMessage}</span>
          </div>
          <button onClick={() => setCrmSyncMessage('')} className="text-emerald-500 hover:text-emerald-700 font-bold font-mono">OK</button>
        </div>
      )}

      {/* 4. WORKSPACE BODY: GRID + GEMINI SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* GRID WRAPPER */}
        <div className="flex-1 overflow-auto bg-slate-100 relative">
          <table className="border-collapse table-fixed w-full select-none">
            <thead>
              <tr className="bg-slate-200 text-slate-600 text-[11px] font-bold h-6 border-b border-slate-400">
                {/* Intersect Corner */}
                <th className="w-8 sticky left-0 z-10 bg-slate-350 border-r border-b border-slate-400 bg-slate-300"></th>
                
                {/* Column Headers */}
                {activeSheet.headers.map((letter, idx) => (
                  <th 
                    key={letter} 
                    className={`border-r border-slate-350 px-1 text-center font-mono ${
                      activeCell.col === idx + 1 ? 'bg-indigo-150 text-indigo-700 bg-indigo-50 border-b-2 border-indigo-500' : ''
                    }`}
                    style={{ width: '130px' }}
                  >
                    {letter}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {Array.from({ length: activeSheet.rowCount }, (_, rIdx) => {
                const row = rIdx + 1;
                return (
                  <tr key={row} className="h-6 border-b border-slate-200 bg-white">
                    {/* Row Indexes */}
                    <td className={`sticky left-0 bg-slate-200 text-slate-500 text-[10px] font-mono font-bold text-center border-r border-slate-350 ${
                      activeCell.row === row ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-400' : ''
                    }`}>
                      {row}
                    </td>

                    {/* Cell Fields */}
                    {activeSheet.headers.map((letter, cIdx) => {
                      const col = cIdx + 1;
                      const ref = `${letter}${row}`;
                      const cellObj = activeSheet.data[ref];
                      
                      const rawVal = cellObj ? cellObj.value : '';
                      const dispVal = getCellDisplayValue(ref, activeSheet.data);
                      const isHighlighted = isSelected(row, col);
                      const isFoundBySearch = cellMatchesSearch(ref, dispVal);
                      
                      const cellStyle = cellObj?.style || {};
                      const evaluatedStyle = getCellStyles(row, letter, cellStyle);

                      const validationResult = isCellValid(ref, dispVal, validationRules[activeSheetId] || []);
                      const isInvalid = !validationResult.isValid;

                      return (
                        <td
                          key={ref}
                          onMouseDown={() => handleCellMouseDown(row, col)}
                          onMouseEnter={() => handleCellMouseEnter(row, col)}
                          onMouseUp={handleCellMouseUp}
                          onDoubleClick={() => handleCellDoubleClick(row, col)}
                          className={`border-r border-slate-200 p-0 text-xs font-sans truncate relative overflow-visible ${
                            isHighlighted ? 'bg-indigo-50/50' : ''
                          } ${isFoundBySearch ? 'bg-amber-100 ring-2 ring-amber-400' : ''} ${
                            isInvalid ? 'bg-red-50/90 ring-1 ring-red-400/50' : ''
                          }`}
                          style={{ backgroundColor: isInvalid ? '#fef2f2' : (evaluatedStyle.backgroundColor || undefined) }}
                          title={isInvalid ? `Rule violation: ${validationResult.error}` : undefined}
                        >
                          
                          {/* Red indicator triangle in top-right corner for invalid entries */}
                          {isInvalid && (
                            <div 
                              className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-red-650 border-l-[6px] border-l-transparent z-20 pointer-events-none"
                              style={{ borderTopColor: '#dc2626' }}
                            />
                          )}

                          {/* Inner formatting and text render */}
                          {isEditing && activeCell.row === row && activeCell.col === col ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => {
                                  setEditValue(e.target.value);
                                  updateCellData(row, col, e.target.value);
                              }}
                              onBlur={() => setIsEditing(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setIsEditing(false);
                                }
                              }}
                              className="absolute inset-0 w-full h-full bg-white text-xs font-mono px-1 underline-none outline-none ring-2 ring-indigo-500 z-50 text-slate-800"
                            />
                          ) : (
                            <div 
                              className={`px-1.5 h-full w-full select-none truncate flex items-center ${isInvalid ? 'text-red-700 font-bold' : ''}`}
                              style={evaluatedStyle}
                            >
                              {dispVal}
                            </div>
                          )}

                          {/* Green cell selection border handles */}
                          {activeCell.row === row && activeCell.col === col && (
                            <div className="absolute inset-0 border-2 border-indigo-600 pointer-events-none z-10">
                              <div className="absolute right-0 bottom-0 w-1.5 h-1.5 bg-indigo-600 rounded-sm translate-x-[3px] translate-y-[3px]" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* GEMINI EXCEL COPILOT CHAT SIDEBAR */}
        <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-hidden font-sans">
          
          {/* Sidebar Title */}
          <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">Gemini Excel Copilot</span>
            </div>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 p-0.5 px-1.5 rounded-full font-bold">ACTIVE v3.5</span>
          </div>

          {/* Chat Logs */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {copilotHistory.map((h, hIdx) => (
              <div 
                key={hIdx} 
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  h.role === 'user' 
                    ? 'bg-indigo-600 text-white ml-6 shadow-sm' 
                    : 'bg-white text-slate-700 border border-slate-100 mr-6 shadow-sm'
                }`}
              >
                <div className="font-bold text-[9px] opacity-75 uppercase flex items-center gap-1">
                  {h.role === 'user' ? 'Ahmed Fawzy' : 'Sierra Smart Copilot'}
                </div>
                <p className="leading-relaxed whitespace-pre-line">{h.text}</p>
              </div>
            ))}

            {isCopilotLoading && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-slate-505 mr-6 flex items-center gap-2 text-xs">
                <RefreshCw size={12} className="animate-spin text-indigo-600" />
                <span className="animate-pulse">Thinking with Gemini-3.5-flash...</span>
              </div>
            )}
          </div>

          {/* Preset Formulas / Quick Prompt helpers */}
          <div className="p-2 border-t border-slate-100 bg-white grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleQuickCopilotAction("Generate 10 real estate leads in New Cairo with names and 8M EGP price point")}
              className="text-[10px] text-left p-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-650 truncate"
            >
              🪄 Generate 10 Leads
            </button>
            <button
              onClick={() => handleQuickCopilotAction("Help me construct an Excel formula to multiply cell F2 by 12% in cell G2")}
              className="text-[10px] text-left p-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-650 truncate"
            >
              📊 Make multiply formula
            </button>
            <button
              onClick={() => handleQuickCopilotAction("Analyze our active CRM spreadsheet and tell me conversion bottlenecks")}
              className="text-[10px] text-left p-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-650 truncate"
            >
              🔍 Analyze CRM stats
            </button>
            <button
              onClick={() => handleQuickCopilotAction("Synthesize 5 property units and pricing for compound SODIC East New Cairo")}
              className="text-[10px] text-left p-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-650 truncate"
            >
              🏠 Generate Compounds
            </button>
          </div>

          {/* Chat Prompt input */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex gap-1 items-center shrink-0">
            <input
              type="text"
              value={copilotPrompt}
              onChange={(e) => setCopilotPrompt(e.target.value)}
              placeholder="Ask Copilot something..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTriggerCopilot();
              }}
              className="flex-1 p-2 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleTriggerCopilot}
              disabled={isCopilotLoading || !copilotPrompt.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Play size={12} className="fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. SPREADSHEET BOTTOM MULTI-TAB SHEETS BAR */}
      <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        
        {/* Dynamic sheet navigation tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-lg">
          {sheets.map(sh => (
            <button
              key={sh.id}
              onClick={() => {
                setActiveSheetId(sh.id);
                setActiveCell({ row: 1, col: 1 });
                setSelectionStart({ row: 1, col: 1 });
                setSelectionEnd({ row: 1, col: 1 });
                setIsEditing(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer whitespace-nowrap ${
                activeSheetId === sh.id
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet size={12} />
              {sh.name}
            </button>
          ))}

          {/* New Tab Button */}
          <button
            onClick={() => {
              const newId = 'sheet_' + Date.now();
              const newName = `Sheet ${sheets.length + 1}`;
              setSheets([...sheets, {
                id: newId,
                name: newName,
                data: {
                  "A1": { value: "Header 1", style: { bold: true, bg: '#f1f5f9', align: 'center' } },
                  "B1": { value: "Header 2", style: { bold: true, bg: '#f1f5f9', align: 'center' } },
                },
                headers: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
                rowCount: 30
              }]);
              setActiveSheetId(newId);
            }}
            className="p-1 px-2 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
            title="Create new sheet"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* ACTIVE RANGE CONTEXT STATS (MS Excel-style metrics) */}
        {stats && stats.hasNumbers && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 font-bold bg-slate-200/50 px-2 rounded-lg py-1 border border-slate-200">
            <span>Range: {stats.rangeLabel}</span>
            <span className="h-2 w-px bg-slate-300" />
            <span>Average: <strong className="text-slate-800">{stats.avg}</strong></span>
            <span className="h-2 w-px bg-slate-300" />
            <span>Count: <strong className="text-slate-800">{stats.count}</strong></span>
            <span className="h-2 w-px bg-slate-300" />
            <span>Sum: <strong className="text-emerald-750 text-emerald-700">{parseFloat(stats.sum as any).toLocaleString()}</strong></span>
            <span className="h-2 w-px bg-slate-300" />
            <span>Max: <strong className="text-slate-800">{parseFloat(stats.max as any).toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* CSV IMPORT POPUP MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800">Paste & Import Spreadsheet Records (CSV)</span>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportCsvRaw('');
                }}
                className="text-slate-500 hover:text-slate-800 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-550 text-slate-500">
                Paste your raw comma-separated lists (including headings in the first row) to load them directly into Sierra interactive grids.
              </p>
              <textarea
                value={importCsvRaw}
                onChange={(e) => setImportCsvRaw(e.target.value)}
                placeholder={`Full Name,WhatsApp Phone,Property Interest,Deal Value (EGP),Lead Status
Yasmin Sabry,+201288829911,Mivida Apartment,11500000,New Lead
Mohamed Salah,+201001122334,Mountain View Townhouse,24000000,Tour Arranged`}
                rows={8}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 text-xs font-mono rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-bold shrink-0">Import Target:</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer">
                  <input
                    type="radio"
                    checked={importTargetTab === 'active'}
                    onChange={() => setImportTargetTab('active')}
                    className="accent-indigo-600"
                  />
                  Overwrite Active Tab
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer">
                  <input
                    type="radio"
                    checked={importTargetTab === 'new'}
                    onChange={() => setImportTargetTab('new')}
                    className="accent-indigo-600"
                  />
                  Create in New Tab
                </label>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportCsvRaw('');
                }}
                className="text-xs bg-white text-slate-600 border border-slate-200 p-1.5 px-4 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCSVImport}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 px-4 rounded-lg font-bold shadow-sm cursor-pointer"
              >
                Import Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONDITIONAL FORMATTING MANAGER MODAL */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-800 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} />
                <span className="font-bold text-sm text-slate-800">
                  Conditional Formatting Rules - {activeSheet.name}
                </span>
              </div>
              <button 
                onClick={() => {
                  setIsRulesModalOpen(false);
                  setEditingRule(null);
                  clearRuleForm();
                }}
                className="text-slate-500 hover:text-slate-800 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* main body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-6 min-h-0">
              
              {/* Left Column: Rule list */}
              <div className="flex-1 flex flex-col gap-3 min-h-[220px]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Sheet Rules</h5>
                
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-2.5 max-h-[280px]">
                  {(conditionalRules[activeSheetId] || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <Sparkles size={24} className="text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No conditional rules defined yet.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Use the creator tool on the right to set up dynamic styles!</p>
                    </div>
                  ) : (
                    (conditionalRules[activeSheetId] || []).map((rule) => {
                      const colHeader = activeSheet.headers.includes(rule.column) ? rule.column : rule.column;
                      // Try to fetch column header label for context
                      const cellHeaderVal = getCellDisplayValue(`${colHeader}1`, activeSheet.data);
                      const displayColLabel = cellHeaderVal ? `Col ${colHeader} (${cellHeaderVal})` : `Column ${colHeader}`;
                      
                      return (
                        <div 
                          key={rule.id} 
                          className={`p-3 bg-white border rounded-xl hover:border-slate-300 transition flex items-center justify-between gap-4 ${
                            editingRule?.id === rule.id ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-250 border-slate-200'
                          }`}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 text-slate-600 bg-slate-100 rounded uppercase">
                                {rule.applyTo === 'row' ? 'Row' : 'Cell'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700 truncate">
                                If <strong className="text-slate-900">{displayColLabel}</strong>
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {getOperatorSymbol(rule.operator)} <strong className="text-indigo-600 font-mono">"{rule.value}"</strong>
                            </p>
                            
                            {/* Visual Preview */}
                            <div 
                              className="text-[10px] p-1 px-2 rounded inline-block border border-slate-200/50 font-semibold mt-1"
                              style={{ 
                                backgroundColor: rule.style.bg || '#ffffff', 
                                color: rule.style.color || '#1e293b',
                                fontWeight: rule.style.bold ? 'bold' : 'normal',
                                fontStyle: rule.style.italic ? 'italic' : 'normal'
                              }}
                            >
                              Format Preview
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditRule(rule)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200 text-[10px] font-bold rounded cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold rounded cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Templates Suite */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Apply Standard template:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {activeSheetId === 'leads' && (
                      <>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'F',
                            operator: 'equals',
                            value: 'Closed Sold',
                            applyTo: 'row',
                            style: { bg: '#e2fbe9', color: '#15803d', bold: true }
                          })}
                          className="p-1 px-2 text-left bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-lg truncate"
                        >
                          🟢 Row green if Closed Sold
                        </button>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'F',
                            operator: 'equals',
                            value: 'No Answer',
                            applyTo: 'row',
                            style: { bg: '#fef2f2', color: '#b91c1c' }
                          })}
                          className="p-1 px-2 text-left bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold rounded-lg truncate"
                        >
                          🔴 Row red if No Answer
                        </button>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'F',
                            operator: 'equals',
                            value: 'Tour Arranged',
                            applyTo: 'cell',
                            style: { bg: '#fef9c3', color: '#a16207', bold: true }
                          })}
                          className="p-1 px-2 text-left bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-250 border-yellow-200 text-[10px] font-semibold rounded-lg truncate"
                        >
                          🟡 Yellow cell if Tour Arranged
                        </button>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'E',
                            operator: 'greater_than',
                            value: '10M',
                            applyTo: 'cell',
                            style: { bg: '#eff6ff', color: '#1d4ed8', bold: true }
                          })}
                          className="p-1 px-2 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold rounded-lg truncate"
                        >
                          💎 Bold blue cell if Price &gt; 10M
                        </button>
                      </>
                    )}
                    {activeSheetId !== 'leads' && (
                      <>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'B',
                            operator: 'contains',
                            value: 'Active',
                            applyTo: 'cell',
                            style: { bg: '#eff6ff', color: '#1e40af', bold: true }
                          })}
                          className="p-1 px-2 text-left bg-slate-50 border hover:bg-slate-100 text-[10px] font-semibold rounded-lg text-slate-600 truncate"
                        >
                          🔵 Highlight cell containing 'Active'
                        </button>
                        <button
                          onClick={() => applySavedTemplateRule({
                            column: 'C',
                            operator: 'greater_than',
                            value: '10000',
                            applyTo: 'row',
                            style: { bg: '#f0fdf4', color: '#166534', bold: true }
                          })}
                          className="p-1 px-2 text-left bg-slate-50 border hover:bg-slate-100 text-[10px] font-semibold rounded-lg text-slate-600 truncate"
                        >
                          ⚡ Highlight row if column value &gt; 10,000
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Rule Editor / Form */}
              <div className="w-full md:w-[280px] bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col shrink-0">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {editingRule ? 'Modify rules formatting' : 'Create formatting rule'}
                </h5>

                {/* Target Column Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Target Column:</label>
                  <select
                    value={newRuleColumn}
                    onChange={(e) => setNewRuleColumn(e.target.value)}
                    className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {activeSheet.headers.map(hdr => {
                      const cellHeaderVal = getCellDisplayValue(`${hdr}1`, activeSheet.data);
                      const displayLabel = cellHeaderVal ? `Col ${hdr} (${cellHeaderVal})` : `Column ${hdr}`;
                      return (
                        <option key={hdr} value={hdr}>{displayLabel}</option>
                      );
                    })}
                  </select>
                </div>

                {/* Condition Rule selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Trigger Condition:</label>
                  <select
                    value={newRuleOperator}
                    onChange={(e) => setNewRuleOperator(e.target.value as any)}
                    className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="equals">is exactly equal to</option>
                    <option value="not_equals">is NOT equal to</option>
                    <option value="contains">contains target text</option>
                    <option value="greater_than">is greater than (&gt;)</option>
                    <option value="less_than">is less than (&lt;)</option>
                  </select>
                </div>

                {/* Condition value */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Comparison Value:</label>
                  <input
                    type="text"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    placeholder="e.g. Closed Sold, 10M, 500000"
                    className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Supports suffix shorthand like <strong>10M</strong> or <strong>250K</strong>.
                  </p>
                </div>

                {/* Target Apply Area */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Formatting Target:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={newRuleApplyTo === 'row'}
                        onChange={() => setNewRuleApplyTo('row')}
                        className="accent-indigo-600"
                      />
                      Entire Row
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={newRuleApplyTo === 'cell'}
                        onChange={() => setNewRuleApplyTo('cell')}
                        className="accent-indigo-600"
                      />
                      Cell Only
                    </label>
                  </div>
                </div>

                {/* Styling outputs */}
                <div className="space-y-2 pt-2 border-t border-slate-250 border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">Output visual format:</span>
                  
                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Background:</span>
                      <div className="flex flex-wrap gap-1">
                        {['', '#fef9c3', '#dcfce7', '#fee2e2', '#dbeafe', '#f3e8ff'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewRuleBg(color)}
                            className={`w-5 h-5 rounded border cursor-pointer ${
                              newRuleBg === color ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-305 border-slate-300'
                            }`}
                            style={{ backgroundColor: color || '#ffffff' }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Text Color:</span>
                      <div className="flex flex-wrap gap-1">
                        {['', '#1e293b', '#b91c1c', '#15803d', '#1d4ed8', '#7c3aed'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewRuleColor(color)}
                            className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center text-[10px] font-bold ${
                              newRuleColor === color ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-300'
                            }`}
                            style={{ color: color || '#1e293b' }}
                          >
                            T
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Font style options */}
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRuleBold}
                        onChange={(e) => setNewRuleBold(e.target.checked)}
                        className="accent-indigo-600 rounded"
                      />
                      Bold Text
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRuleItalic}
                        onChange={(e) => setNewRuleItalic(e.target.checked)}
                        className="accent-indigo-600 rounded"
                      />
                      Italic
                    </label>
                  </div>
                </div>

                {/* Save actions */}
                <div className="flex items-center gap-1.5 pt-1.5">
                  {editingRule && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRule(null);
                        clearRuleForm();
                      }}
                      className="flex-1 p-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveRule}
                    className="flex-1 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    {editingRule ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsRulesModalOpen(false);
                  setEditingRule(null);
                  clearRuleForm();
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white p-2 px-5 rounded-lg font-bold"
              >
                Close Rule Manager
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
