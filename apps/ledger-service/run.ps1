$env:MAVEN_HOME = "C:\Users\Krico\Documents\proyectos\banking\tools\maven\apache-maven-3.9.6"
$env:PATH = "$env:MAVEN_HOME\bin;$env:PATH"
Set-Location -LiteralPath "C:\Users\Krico\Documents\proyectos\banking\apps\ledger-service"
mvn spring-boot:run
