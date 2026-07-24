import pandas as pd

# Create a DataFrame with the exact columns needed by ExcelLessonsImport.jsx
# 'Guruh', 'Sana', 'Mavzu', 'Oqituvchi'

data = {
    'Guruh': ['Rassomchilik-1A', 'Haykaltaroshlik-2B', 'Guruh nomini shu yerga yozing'],
    'Sana': ['2026-07-24', '2026-07-25', 'YYYY-MM-DD formatida'],
    'Boshlanish': ['09:00', '14:00', 'Dars boshlanish vaqti'],
    'Tugash': ['15:00', '20:00', 'Dars tugash vaqti'],
    'Mavzu': ['Rangtasvir asoslari', 'Loy bilan ishlash', 'Modul yoki fan mavzusi'],
    'Oqituvchi': ['Abdulla Oripov', 'Shuhrat Abbosov', 'Ism Familiya (ixtiyoriy)']
}

df = pd.DataFrame(data)

# Create a Pandas Excel writer using XlsxWriter as the engine.
writer = pd.ExcelWriter('Darslar_Shabloni.xlsx', engine='xlsxwriter')

# Convert the dataframe to an XlsxWriter Excel object.
df.to_excel(writer, sheet_name='Darslar', index=False)

# Get the xlsxwriter workbook and worksheet objects.
workbook  = writer.book
worksheet = writer.sheets['Darslar']

# Add some cell formats.
header_format = workbook.add_format({
    'bold': True,
    'text_wrap': True,
    'valign': 'top',
    'fg_color': '#4F46E5',
    'font_color': 'white',
    'border': 1})

# Write the column headers with the defined format.
for col_num, value in enumerate(df.columns.values):
    worksheet.write(0, col_num, value, header_format)

# Set column widths
worksheet.set_column('A:A', 25)
worksheet.set_column('B:B', 15)
worksheet.set_column('C:C', 15)
worksheet.set_column('D:D', 15)
worksheet.set_column('E:E', 35)
worksheet.set_column('F:F', 25)

# Close the Pandas Excel writer and output the Excel file.
writer.close()
print("Darslar_Shabloni.xlsx created successfully.")
