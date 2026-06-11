(() => {
	window.addEventListener('load', () => {
		if (window.lucide?.createIcons) {
			window.lucide.createIcons();
		}

		const downloadBtn = document.getElementById('btnDownloadPage');
		if (!downloadBtn) return;

		downloadBtn.addEventListener('click', () => {
			const enablePdfMode = () => document.body.classList.add('pdf-export');
			const disablePdfMode = () => document.body.classList.remove('pdf-export');
			const clearBreaks = (root) => {
				root.querySelectorAll('.pdf-break-before').forEach((el) =>
					el.classList.remove('pdf-break-before'),
				);
			};
			const getPageHeightPx = (contentWidth) => {
				const { jsPDF } = window.jspdf || {};
				if (!jsPDF) return contentWidth * (277 / 190);
				const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
				const pageWidth = pdf.internal.pageSize.getWidth();
				const pageHeight = pdf.internal.pageSize.getHeight();
				const margin = 10;
				const usableWidth = pageWidth - margin * 2;
				const usableHeight = pageHeight - margin * 2;
				return contentWidth * (usableHeight / usableWidth);
			};
			const injectBreaks = (root) => {
				clearBreaks(root);
				const rows = Array.from(root.querySelectorAll('.manual-row'));
				if (!rows.length) return;
				const rootRect = root.getBoundingClientRect();
				const contentWidth = rootRect.width || root.clientWidth;
				const pageHeight = getPageHeightPx(contentWidth);
				const buffer = 48;

				rows.forEach((row, index) => {
					const rect = row.getBoundingClientRect();
					const top = rect.top - rootRect.top;
					const height = rect.height;
					const pageTop = Math.floor(top / pageHeight) * pageHeight;
					const remaining = pageTop + pageHeight - top;
					if (index > 0 && height + buffer > remaining) row.classList.add('pdf-break-before');
				});
			};

			if (!window.html2pdf) {
				enablePdfMode();
				window.print();
				window.setTimeout(disablePdfMode, 1000);
				return;
			}
			const manualRoot = document.querySelector('.manual-bg') || document.body;

			enablePdfMode();
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					injectBreaks(manualRoot);
					window
						.html2pdf()
						.set({
							margin: [10, 10, 10, 10],
							filename: 'Manual_Usuario_TimeTracking_V13.pdf',
							image: { type: 'jpeg', quality: 0.98 },
							html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
							jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
							pagebreak: {
								mode: ['css', 'legacy'],
								before: '.pdf-break-before, .pdf-break-force',
								avoid: ['.manual-row', '.manual-card', '.info-box'],
							},
						})
						.from(manualRoot)
						.save()
						.then(() => {
							clearBreaks(manualRoot);
							disablePdfMode();
						})
						.catch(() => {
							clearBreaks(manualRoot);
							disablePdfMode();
						});
				}),
			);
		});
	});
})();
