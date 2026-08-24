import xlsxwriter

workbook = xlsxwriter.Workbook('admin/public/Eski_darslar_shabloni.xlsx')
worksheet = workbook.add_worksheet('Soatlar')

header_format = workbook.add_format({
    'bold': True,
    'text_wrap': True,
    'valign': 'top',
    'align': 'center',
    'fg_color': '#D7E4BC',
    'border': 1
})

hint_format = workbook.add_format({
    'text_wrap': True,
    'valign': 'top',
    'color': 'gray',
    'italic': True
})

data_format = workbook.add_format({
    'border': 1,
    'align': 'center'
})
text_format = workbook.add_format({
    'border': 1
})

worksheet.write('A1', "O'qituvchi F.I.Sh", header_format)
worksheet.write('B1', 'Fan nomi', header_format)
worksheet.write('C1', 'Guruh nomi', header_format)
worksheet.write('D1', 'Nazariy soat', header_format)
worksheet.write('E1', 'Amaliy soat', header_format)

worksheet.set_column('A:A', 35)
worksheet.set_column('B:B', 30)
worksheet.set_column('C:C', 20)
worksheet.set_column('D:D', 15)
worksheet.set_column('E:E', 15)

worksheet.write('A2', 'Misol: Alimov Nodir Yunusovich', hint_format)
worksheet.write('B2', 'Xorijiy til', hint_format)
worksheet.write('C2', '201-guruh', hint_format)
worksheet.write('D2', 12, hint_format)
worksheet.write('E2', 8, hint_format)

workbook.close()
