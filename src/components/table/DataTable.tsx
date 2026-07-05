'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  pageIndex: number; // 0-indexed
  pageSize: number;
  onPageIndexChange: (index: number) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  bulkActions?: React.ReactNode;
  loading?: boolean;
  exportFilename?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pageIndex,
  pageSize,
  onPageIndexChange,
  sorting = [],
  onSortingChange,
  rowSelection = {},
  onRowSelectionChange,
  bulkActions,
  loading = false,
  exportFilename = 'export.csv',
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: (updater) => {
      if (onSortingChange) {
        const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
        onSortingChange(nextSorting);
      }
    },
    onRowSelectionChange: (updater) => {
      if (onRowSelectionChange) {
        const nextSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
        onRowSelectionChange(nextSelection);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: false,
  });

  const selectedRowsCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

  const handleExportCSV = () => {
    if (!data || !data.length) {
      toast.error('No data available to export.');
      return;
    }

    // Filter out selection checkboxes or actions column from export
    const exportCols = columns.filter((col) => {
      const colId = col.id || (col as any).accessorKey;
      return colId !== 'select' && colId !== 'actions';
    });

    const headers = exportCols.map((col) => {
      if (typeof col.header === 'string') return col.header;
      return col.id || (col as any).accessorKey || '';
    });

    const rowsToExport = selectedRowsCount > 0
      ? data.filter((_, idx) => rowSelection[idx.toString()])
      : data;

    const csvRows = rowsToExport.map((row) =>
      exportCols.map((col) => {
        const accessorFn = (col as any).accessorFn;
        const accessor = (col as any).accessorKey;
        const colId = col.id;
        let val = '';
        
        if (typeof accessorFn === 'function') {
          val = accessorFn(row);
        } else if (accessor) {
          val = (row as any)[accessor];
        } else if (colId) {
          val = (row as any)[colId];
        }

        if (val === null || val === undefined) {
          return '""';
        }
        if (typeof val === 'object') {
          // Flatten simple passenger/driver details if present
          if ((val as any).firstName || (val as any).lastName) {
            return `"${((val as any).firstName || '')} ${((val as any).lastName || '')}"`;
          }
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', exportFilename.endsWith('.csv') ? exportFilename : `${exportFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Successfully exported ${rowsToExport.length} rows to CSV.`);
  };

  const handleExportPDF = () => {
    if (!data || !data.length) {
      toast.error('No data available to export.');
      return;
    }

    const exportCols = columns.filter((col) => {
      const colId = col.id || (col as any).accessorKey;
      return colId !== 'select' && colId !== 'actions';
    });

    const headers = exportCols.map((col) => {
      if (typeof col.header === 'string') return col.header;
      return col.id || (col as any).accessorKey || '';
    });

    const rowsToExport = selectedRowsCount > 0
      ? data.filter((_, idx) => rowSelection[idx.toString()])
      : data;

    const pdfRows = rowsToExport.map((row) =>
      exportCols.map((col) => {
        const accessorFn = (col as any).accessorFn;
        const accessor = (col as any).accessorKey;
        const colId = col.id;
        let val: any = '';
        
        if (typeof accessorFn === 'function') val = accessorFn(row);
        else if (accessor) val = (row as any)[accessor];
        else if (colId) val = (row as any)[colId];

        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          if ((val as any).firstName || (val as any).lastName) {
            return `${((val as any).firstName || '')} ${((val as any).lastName || '')}`;
          }
          return JSON.stringify(val);
        }
        return String(val);
      })
    );

    const doc = new jsPDF('landscape');
    const title = exportFilename.replace('.csv', '');
    
    doc.setFontSize(16);
    doc.text(`Export: ${title}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: pdfRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(exportFilename.endsWith('.csv') ? exportFilename.replace('.csv', '.pdf') : `${exportFilename}.pdf`);
    toast.success(`Successfully exported ${rowsToExport.length} rows to PDF.`);
  };

  return (
    <div className="space-y-4">
      {/* Table Action Controls */}
      <div className="flex justify-between items-center gap-4">
        {selectedRowsCount > 0 ? (
          <div className="bg-[#0a0a0a] border border-[var(--color-neon)]/30 px-5 py-3 rounded-2xl flex items-center justify-between gap-4 animate-fade-in w-full shadow-[0_0_20px_rgba(0,255,128,0.1)]">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-neon)] animate-pulse shadow-[0_0_10px_rgba(0,255,128,0.5)]" />
              <span className="text-sm font-black text-white tracking-widest uppercase">
                {selectedRowsCount} row{selectedRowsCount > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-xs font-mono text-slate-500 font-bold uppercase tracking-widest mr-2 hidden sm:block">Export As:</span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-[#111111] hover:bg-white/10 text-[var(--color-neon)] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-[var(--color-neon)]/20 shadow-sm"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-[#111111] hover:bg-white/10 text-pink-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-pink-500/20 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              {bulkActions}
            </div>
          </div>
        ) : (
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-[#111111] hover:bg-white/5 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Full Page (CSV)
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-[#111111] hover:bg-white/5 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Export Full Page (PDF)
            </button>
          </div>
        )}
      </div>

      {/* Main Table Wrapper */}
      <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden shadow-lg dark:shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <svg className="animate-spin h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-500">
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className={`py-4 px-6 select-none ${
                          isSortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-300' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="text-xs text-slate-400 dark:text-slate-600 font-bold">
                              {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : '⇅'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-900/60 text-sm">
              {loading && data.length === 0 ? (
                [...Array(pageSize || 5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="py-4 px-6">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    No results found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-4 px-6 text-slate-600 dark:text-slate-350">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {pageCount > 1 && (
          <div className="bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-900 px-6 py-4 flex items-center justify-between text-slate-500 dark:text-slate-550">
            <span className="text-xs font-semibold font-mono">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageIndexChange(pageIndex - 1)}
                disabled={pageIndex === 0 || loading}
                className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 border border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => onPageIndexChange(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1 || loading}
                className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 border border-slate-200 dark:border-slate-900 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
