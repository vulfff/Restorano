#!/usr/bin/env bash
# Always clean before running so stale compiled classes never survive a source change.
./mvnw clean spring-boot:run
