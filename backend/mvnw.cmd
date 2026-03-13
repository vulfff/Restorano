@REM Apache Maven Wrapper startup batch script
@SETLOCAL

@SET MAVEN_PROJECTBASEDIR=%~dp0
@IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%

@SET MVNW_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar

@IF DEFINED JAVA_HOME (
  @SET JAVA_EXE=%JAVA_HOME%\bin\java.exe
) ELSE (
  @SET JAVA_EXE=java.exe
)

@IF NOT EXIST "%MVNW_JAR%" (
  powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '%MVNW_JAR%'"
)

"%JAVA_EXE%" %MAVEN_OPTS% -classpath "%MVNW_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" org.apache.maven.wrapper.MavenWrapperMain %*

@ENDLOCAL
